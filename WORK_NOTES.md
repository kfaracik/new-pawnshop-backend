# Zakres Prac

## Accessibility

- Backend nie posiada warstwy UI, więc accessibility dotyczy pośrednio jakości API i przewidywalności odpowiedzi.
- Zachowano prostsze, bardziej spójne komunikaty błędów i wspólne utility requestowe.

## Technical Debt

- Kod nadal jest głównie warstwowy, nie domenowy.
- Brakuje testów integracyjnych dla tras HTTP oraz walidacji wejścia na poziomie schematów.
- Część kontrolerów nadal zawiera zbyt dużo logiki operacyjnej.

## Animations

- Nie dotyczy, projekt nie ma warstwy prezentacyjnej.

## Dalsze kroki

- Grupowanie kodu według domen: `auth`, `products`, `categories`, `orders`, `auctions`.
- Dodanie walidacji requestów na wejściu.
- Dodanie testów integracyjnych dla endpointów i middleware.

## Największe pliki do planowanego refaktoru

- `src/controllers/auctionController.ts`
- `src/controllers/orderController.ts`
- `src/routes/productRoutes.ts`

Te pliki są już kandydatami do dalszego podziału na mniejsze moduły domenowe i warstwę walidacji.

## Zrealizowane od ostatniej aktualizacji

- Dodano wspólne request logging middleware.
- Dodano audit logging dla produktów i kategorii, obok istniejących logów zamówień.
