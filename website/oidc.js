// TODO: do we care if not valid?
function checkSessionCookie() {
  const cookies = document.cookie;
  const sessionCookie = cookies.split('; ').find(row => row.startsWith('session='));

  if (!sessionCookie) {
    window.location.href = "/login.html"; 
  }
}
