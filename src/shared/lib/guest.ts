const GUEST_ID_KEY = "guest_id";

function getGuestId(): string {
  let guestId = localStorage.getItem(GUEST_ID_KEY);

  if (!guestId) {
    const newGuestId = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, newGuestId);
    guestId = newGuestId;
  }

  return guestId;
}

export default getGuestId;
