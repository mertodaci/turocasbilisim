// TaskQube bilet listesi icin kodda "tq-tickets", "tq-tickets-active",
// "tq-tickets-board" (+boardId), "tq-tickets-count", "tq-tickets-customer"
// gibi COK sayida farkli query key kullaniliyor. Her mutation'in bunlarin
// sadece bir kismini tek tek invalidate etmesi -- ekrana gore bayat veri
// kalmasina yol aciyordu (ornegin bilet duzenleyince Biletler listesi
// gunceli gostermiyordu, cunku o ekran "tq-tickets-active" kullaniyor ama
// duzenleme sadece "tq-tickets"/"tq-tickets-board"i tazeliyordu).
//
// Bunun yerine "tq-tickets" ile BASLAYAN her query key'i tek seferde
// tazele -- yeni bir ekran/key eklense bile otomatik kapsanir.
export function invalidateTicketQueries(queryClient) {
  queryClient.invalidateQueries({
    predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("tq-tickets"),
  });
}
