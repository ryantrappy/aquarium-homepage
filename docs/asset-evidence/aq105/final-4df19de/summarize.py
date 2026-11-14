"""Recompute the bounded native observations; keep all original samples in review.json."""
import hashlib
import json
import math
import pathlib
import struct

HERE = pathlib.Path(__file__).resolve().parent
raw = json.loads((HERE / 'review.json').read_text())
assert raw['sourceCommit'] == '4df19dee01ccf4e95a49904bfa51eb3a71730ba4'


def parsed(entries):
    return [json.loads(row['message'].split('__AQ105_FINAL_FRAME__', 1)[1]) for row in entries]


def cycle(rows, viewport):
    assert rows and all(row['viewport'] == viewport for row in rows)
    assert all(not (r['paused'] or r['hidden'] or r['reduced'] or r['routeActive']) for r in rows)
    assert all(r['target'] == 'hostAnemone' and r['clipActive'] for r in rows)
    homes = [min(r['hosts'], key=lambda h: h['distance']) for r in rows]
    assert len({h['id'] for h in homes}) == 1
    assert all(h['point'] == 'clear' for h in homes)
    for r in rows:
        assert all(math.isfinite(v) for v in r['position'].values())
        assert all(math.isfinite(v) for b in r['bones'] for v in b['position'] + b['quaternion'])
    return {
        'samples': len(rows), 'activeTimeRange': [min(r['time'] for r in rows), max(r['time'] for r in rows)],
        'states': sorted({r['state'] for r in rows}), 'host': homes[0]['id'],
        'maxDistanceLegacyUnits': max(h['distance'] for h in homes),
        'positionSpanLegacyUnits': {a: max(r['position'][a] for r in rows) - min(r['position'][a] for r in rows) for a in 'xyz'},
        'uniqueBonePoses': {b['name']: len({tuple(next(v for v in r['bones'] if v['name'] == b['name'])['quaternion']) for r in rows}) for b in rows[0]['bones']},
        'allFinite': True, 'allNearestHostPointsClear': True,
    }


# The entire captured laptop joint window; no position/state filtering.
laptop = list({r['time']: r for r in parsed(raw['frames']) if r['viewport'] == [1440, 900, 1]}.values())
# The explicitly captured settled phone window, retained verbatim separately.
phone = raw['phoneSettledFrames']
summary = {'sourceCommit': raw['sourceCommit'], 'laptopCycle': cycle(laptop, [1440, 900, 1]), 'phoneCycle': cycle(phone, [402, 874, 1])}
assert all(v > 0 for k in ['laptopCycle', 'phoneCycle'] for v in summary[k]['positionSpanLegacyUnits'].values())
assert all(v > 1 for k in ['laptopCycle', 'phoneCycle'] for v in summary[k]['uniqueBonePoses'].values())
summary['controls'] = {}
for mode in ['laptopResume', 'laptopPauseVisible', 'laptopReducedVisible', 'phoneResumeVisible', 'phonePauseVisible', 'phoneReducedVisible']:
    value = raw[mode]
    before, after = value['before'], value['after']
    assert value['frames'] == 60 and len(before['links']) == len(after['links']) == 8
    assert all(not p['hidden'] and p['visibility'] == 'visible' for p in [before, after])
    changes = sum(a['transform'] != b['transform'] for a, b in zip(before['links'], after['links']))
    if 'Pause' in mode:
        assert before['paused'] and after['paused'] and changes == 0
    elif 'Reduced' in mode:
        assert before['reduced'] and after['reduced'] and changes == 0
    else:
        assert not before['paused'] and not before['reduced'] and changes > 0
    summary['controls'][mode] = {'changedOf8': changes, 'frames': 60, 'visible': True, 'viewport': [before['width'], before['height'], before['dpr']]}
summary['dialogs'] = {}
for mode, viewport in [('laptop', [1440, 900]), ('phone', [402, 874])]:
    for kind in ['Services', 'Settings']:
        value = raw[mode + kind]
        r = value['rect']
        assert 0 <= r['left'] < r['right'] <= viewport[0] and 0 <= r['top'] < r['bottom'] <= viewport[1]
        assert len(value['links' if kind == 'Services' else 'services']) == 8
        if kind == 'Services':
            assert all(a['target'] == '_blank' and a['url'].startswith('http://127.0.0.1:5215/review-service/') for a in value['links'])
        summary['dialogs'][mode + kind] = {'entries': 8, 'contained': True, 'rect': r}
assert raw['openedService']['url'] == 'http://127.0.0.1:5215/review-service/example-home-assistant'
summary['openedService'] = raw['openedService']
summary['capturedWarningsErrors'] = len(raw['finalCapturedWarnings'])
summary['images'] = {}
for name, expected in [('laptop.png', (1440, 900)), ('phone.png', (402, 874)), ('phone-paused-settled-a.png', (402, 874)), ('phone-paused-settled-b.png', (402, 874))]:
    data = (HERE / name).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n' and struct.unpack('>II', data[16:24]) == expected
    summary['images'][name] = {'sha256': hashlib.sha256(data).hexdigest(), 'dimensions': expected}
summary['settledPausedPngPairIdentical'] = summary['images']['phone-paused-settled-a.png']['sha256'] == summary['images']['phone-paused-settled-b.png']['sha256']
assert summary['settledPausedPngPairIdentical']
(HERE / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
