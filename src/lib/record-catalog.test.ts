import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultCategory,
  recordChoices,
  recordUnits,
} from "./record-catalog.ts";

describe("defaultCategory", () => {
  it("maps record modules to catalog categories", () => {
    assert.equal(defaultCategory("crops"), "crops");
    assert.equal(defaultCategory("livestock"), "animals");
    assert.equal(defaultCategory("poultry"), "animals");
    assert.equal(defaultCategory("eggs"), "custom");
    assert.equal(defaultCategory("warehouse"), "custom");
  });
});

describe("recordChoices", () => {
  it("offers plants for crop records, never animal names", () => {
    const choices = recordChoices("crops", "crops");
    assert.ok(choices.includes("Maize"));
    assert.ok(!choices.includes("Goats"));
  });

  it("offers all animals for livestock records", () => {
    const choices = recordChoices("animals", "livestock");
    assert.ok(choices.includes("Cattle"));
    assert.ok(choices.includes("Goats"));
  });

  it("restricts poultry records to birds", () => {
    const choices = recordChoices("animals", "poultry");
    assert.ok(choices.includes("Chickens"));
    assert.ok(choices.includes("Guinea fowl"));
    assert.ok(!choices.includes("Cattle"));
    assert.ok(!choices.includes("Rabbits"));
  });

  it("offers nothing for custom records", () => {
    assert.deepEqual(recordChoices("custom", "eggs"), []);
  });
});

describe("recordUnits", () => {
  it("counts plants first for crops", () => {
    const units = recordUnits("crops", "Maize", "crops");
    assert.equal(units[0], "plants");
    assert.ok(units.includes("bags"));
  });

  it("uses the selected animal as the count unit", () => {
    assert.deepEqual(recordUnits("animals", "Goats", "livestock"), ["goats", "kg"]);
    assert.deepEqual(recordUnits("animals", "Cattle", "livestock"), ["cattle", "kg"]);
  });

  it("falls back to a generic animal unit for unknown names", () => {
    assert.equal(recordUnits("animals", "Alpacas", "livestock")[0], "animals");
  });

  it("leads with litres for milk and eggs/trays for eggs without duplicates", () => {
    assert.equal(recordUnits("custom", "Morning milking", "milk")[0], "litres");
    const eggUnits = recordUnits("custom", "Eggs collected", "eggs");
    assert.deepEqual(eggUnits.slice(0, 2), ["eggs", "trays"]);
    assert.equal(new Set(eggUnits).size, eggUnits.length, "unit lists must not repeat a unit");
  });

  it("gives plain custom records the general unit list", () => {
    const units = recordUnits("custom", "Maize in store", "warehouse");
    assert.ok(units.includes("items"));
    assert.ok(!units.includes("trays"));
  });
});
