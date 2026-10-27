const test = require("node:test");
const assert = require("node:assert/strict");

const { uniqueSubjectCodes } = require("../src/services/codes.service");

// El código se usa como id de nodo en React Flow: un id repetido rompe el
// grafo. Criterio: el primero conserva el código; los siguientes reciben
// -<últimos 5 del _id>. Sin code se usa el final del _id.
test("uniqueSubjectCodes conserva el primer código y sufija los repetidos", () => {
  const ids = ["a".repeat(19) + "11111", "a".repeat(19) + "22222", "a".repeat(19) + "33333"];
  const map = uniqueSubjectCodes([
    { _id: ids[0], code: "ACA" },
    { _id: ids[1], code: "ACA" },
    { _id: ids[2], code: "  ACA  " },
  ]);

  assert.equal(map.get(ids[0]), "ACA");
  assert.equal(map.get(ids[1]), "ACA-22222");
  assert.equal(map.get(ids[2]), "ACA-33333");
});

test("uniqueSubjectCodes usa el final del _id cuando no hay code", () => {
  const id = "b".repeat(16) + "abcdefgh";
  const map = uniqueSubjectCodes([{ _id: id }]);

  assert.equal(map.get(id), "abcdefgh");
});

test("uniqueSubjectCodes resuelve colisión también entre fallbacks", () => {
  const ids = ["c".repeat(16) + "zar12345", "d".repeat(16) + "zar12345"];
  const map = uniqueSubjectCodes([{ _id: ids[0] }, { _id: ids[1] }]);

  assert.equal(map.get(ids[0]), "zar12345");
  assert.equal(map.get(ids[1]), "zar12345-12345");
});
