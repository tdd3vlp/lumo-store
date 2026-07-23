// Single source of truth for the digital-code reveal warning. The version is
// stored on every audit row (warning_version) so a dispute can prove exactly
// which text the customer accepted. Bump WARNING_VERSION whenever the wording
// below changes — never edit the text in place without bumping.
//
// Pure constants (no imports, no "server-only") so the same copy is shared by
// the client modal and the server-side audit records.

export const WARNING_VERSION = 1;

export const CODE_REVEAL_WARNING = {
  version: WARNING_VERSION,
  title: "⚠️ Получение цифрового кода",
  body: [
    "Вы собираетесь получить цифровой код активации.",
    "Перед продолжением убедитесь, что авторизованы в том аккаунте сервиса, для которого приобретён данный товар.",
    "После отображения цифрового кода претензии, связанные с уже активированными, использованными либо переданными третьим лицам кодами, не принимаются.",
    "Не передавайте код другим лицам и не публикуйте его в открытом доступе.",
  ],
  checkbox:
    "Я ознакомился с условиями получения цифрового товара и подтверждаю получение кода после его отображения.",
  cancelLabel: "Отмена",
  revealLabel: "Показать код",
} as const;
