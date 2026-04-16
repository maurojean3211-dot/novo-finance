// src/utils.js

export function formatarData(data) {
  if (!data) return "";

  return data.split("-").reverse().join("/");
}