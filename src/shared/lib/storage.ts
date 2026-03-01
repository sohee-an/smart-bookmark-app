class Storage {
  get<T>(key: string): T | null {
    const value = localStorage.getItem(key);
    if (!value) return null;
    return JSON.parse(value);
  }
  set<T>(key: string, value: T) {
    const json = JSON.stringify(value);
    localStorage.setItem(key, json);
  }

  remove(key: string) {
    localStorage.removeItem(key);
  }

  // Cookie 관리 (Middleware와의 동기화를 위해)
  cookie = {
    set(key: string, value: string, days = 7) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = "expires=" + date.toUTCString();
      document.cookie = `${key}=${value};${expires};path=/;SameSite=Lax`;
    },
    get(key: string) {
      const name = key + "=";
      const decodedCookie = decodeURIComponent(document.cookie);
      const ca = decodedCookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
          return c.substring(name.length, c.length);
        }
      }
      return "";
    },
    remove(key: string) {
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  };
}

const storage = new Storage();
export default storage;
