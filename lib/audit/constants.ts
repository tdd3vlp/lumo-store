// Single source of truth for the digital-code reveal warning. The version is
// stored on every audit row (warning_version) so a dispute can prove exactly
// which text the customer accepted. Bump WARNING_VERSION whenever the wording
// below changes — never edit the text in place without bumping.
//
// Pure constants (no imports, no "server-only") so the same copy is shared by
// the client modal and the server-side audit records.

export const WARNING_VERSION = 2;

export const CODE_REVEAL_WARNING = {
  version: WARNING_VERSION,
  title: "⚠️ Получение кода",
  body: [
    "Убедитесь, что активируете код на нужном аккаунте.",
    "После успешного отображения код считается полученным.",
    "Претензии по активированным/ использованным кодам не принимаются.",
  ],
  checkbox: "Я ознакомлен(а) с информацией и подтверждаю получение кода.",
  cancelLabel: "Отмена",
  revealLabel: "Показать код",
} as const;
