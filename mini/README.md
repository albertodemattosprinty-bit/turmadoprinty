# Mini - estrutura inicial

Este modulo prepara 3 frentes sincronizadas para o Ministerio Infantil:

- Web: rota `/mini` servida por `public/mini/index.html`
- Flutter Android (Play Store): mesmo layout e mesmo asset
- Flutter iOS (Apple): mesmo layout e mesmo asset

## Estrutura

- `public/mini/index.html`: tela branca com `mini.png` centralizado.
- `mini/flutter/lib/main.dart`: tela Flutter equivalente.
- `mini/flutter/assets/images/mini.png`: asset compartilhado.
- `mini/flutter/pubspec.yaml`: registro do asset.
- `mini/docs/roadmap.md`: proximos passos tecnicos.

## Como validar rapido

1. Rodar backend atual e abrir `http://localhost:<porta>/mini`.
2. No Flutter:
   - `cd mini/flutter`
   - `flutter pub get`
   - `flutter run -d chrome` (web)
   - `flutter run -d android` (Android)
   - `flutter run -d ios` (macOS com Xcode)
