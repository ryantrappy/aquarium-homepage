import { info, selected } from './shared'
// Separate dynamic entry points avoid loading all engines for each measurement.
const modulePromise = selected === 'babylon' ? import('./babylon') : selected === 'playcanvas' ? import('./playcanvas') : import('./three')
modulePromise.then(module => module.run()).catch(error => {
  console.error(error)
  info.textContent = `${selected} failed: ${String(error)}`
})
