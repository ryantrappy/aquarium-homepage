# Aquarium accessibility audit

Audit scope is keyboard access, focus order and return behavior, accessible names, settings-dialog semantics, and reduced-motion behavior. Responsive checks are limited to the agreed 402×874 and 1440×900 viewports.

## Findings and changes

| Area | Audit finding | Change or existing behavior |
| --- | --- | --- |
| Scene navigation | Service fish are links and aquarium controls are native buttons. | Fish links name the service and new-tab action. Services, pause, and settings buttons have accessible names. |
| Settings dialogs | Both settings surfaces use native modal `dialog` elements with labelled headings and cancel handling. | Dialogs retain native modal keyboard containment. The parent restores focus to the opener when each dialog closes. |
| Settings open and edit | The service form needs a useful initial target and Edit should enter the form directly. | Opening settings and choosing Edit focus the service-name field. Edit and Remove row actions include the service name in their accessible labels. |
| Async save and errors | Disabling the focused submit during an awaited mutation can drop focus; a failed mutation must leave the current draft available. | Successful add, edit, delete, reset, or retry returns focus to the service-name field. Successful import returns focus to Import list. A failure focuses an assertive, visible error message; the handlers leave the draft and import text intact. Messages use live status/error roles and are placed with the form. |
| Delete and clear flows | The Keep action removes itself when cancelling confirmation. | Keep returns focus to that service's Remove button. Clear and Cancel edit return focus to the service-name field. Successful removal returns focus to the form. |
| Touch controls | Root review found 21-pixel row actions and 36-pixel main controls. | Aquarium controls, close/manage controls, service row actions, form actions, search controls, import/export actions, and inputs now provide at least 44-pixel targets. Fish options remain at least 51 pixels high. |
| Reduced motion | The scene reads `prefers-reduced-motion`, updates when the system preference changes, combines it with the user's pause state, and removes fish animation in CSS. | Scroll-to-message focus uses immediate browser scrolling; no smooth-scroll behavior is added. The pause control clearly identifies when reduced motion is system-controlled. |

## Verification status

Root browser review on November 3, 2026 covered 402×874 and 1440×900. Native radio arrow selection, edit preselection, successful save focus, failed-save alert focus with retained draft, Cancel, Keep, successful removal, Escape and opener focus return passed. Native dialog keyboard containment remained active. A first save-focus implementation failed review because it ran before disabled inputs were re-enabled; the post-commit correction passed the repeated interaction.

At 402×874, page and settings had no horizontal overflow; action buttons and inputs measured at least 44 pixels high, and the fish choices remained readable and selectable. The [reviewed phone settings capture](../design/settings-phone-reviewed.png) records the layout. Emulated system reduced motion removed all three fish animations, identified the disabled pause control, and left the fish links and settings operable. Temporary browser test overrides were removed after review. The live 3D renderer will need these same checks when integrated.
