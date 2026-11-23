export function notifyTabs(key: string) {
  try {
    localStorage.setItem(key, crypto.randomUUID())
  } catch {
    // As outras abas também consultam a API quando voltam a ficar visíveis.
  }
}
