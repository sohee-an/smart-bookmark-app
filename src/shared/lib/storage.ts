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
}

const storage = new Storage();
export default storage;
