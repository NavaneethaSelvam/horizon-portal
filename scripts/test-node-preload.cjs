// Node 24 on this Windows runner exposes no process.geteuid(), so tsx falls
// back to os.userInfo(), which fails with uv_os_get_passwd/ENOMEM here.
// This only affects the test runner's temporary IPC directory naming.
if (typeof process.geteuid !== "function") {
  process.geteuid = () => 0;
}
