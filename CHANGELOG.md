# CHANGELOG.md

## 1.3.1 (2023-01-19)

Fix:

  - Service Worker would go to sleep after some time of inactivity, causing the extension to stop working. This is due to a mv3 change in Chrome. Fixed by moving async function from eventhandler an anonymous function.