import storage from "./storage";

export const GUEST_ID_KEY = "guest_id";

function getGuestId(): string {
  let guestId = storage.get<string>(GUEST_ID_KEY);

  if (!guestId) {
    const newGuestId = crypto.randomUUID();
    storage.set(GUEST_ID_KEY, newGuestId);
    guestId = newGuestId;
  }

  return guestId;
}

export default getGuestId;
