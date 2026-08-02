"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const department_hierarchy_1 = require("./department-hierarchy");
function chainLookup(chain) {
    return async (id) => chain[id] ?? null;
}
describe("assertNoParentCycle", () => {
    it("department BARU (id null) selalu lolos, apapun proposedParentId-nya", async () => {
        await expect((0, department_hierarchy_1.assertNoParentCycle)(null, "any-parent", chainLookup({}))).resolves.toBeUndefined();
    });
    it("proposedParent yang bukan leluhur -> lolos", async () => {
        // dept-1 -> dept-2 -> dept-3 (root). dept-4 mau jadi anak dept-3, valid.
        const chain = { "dept-2": "dept-3", "dept-3": null };
        await expect((0, department_hierarchy_1.assertNoParentCycle)("dept-4", "dept-3", chainLookup(chain))).resolves.toBeUndefined();
    });
    it("BR-07: proposedParent = diri sendiri -> throw", async () => {
        await expect((0, department_hierarchy_1.assertNoParentCycle)("dept-1", "dept-1", chainLookup({}))).rejects.toThrow(department_hierarchy_1.DepartmentCycleError);
    });
    it("BR-07: proposedParent adalah TURUNAN department ini (siklus tidak langsung) -> throw", async () => {
        // dept-1 mau pindah jadi anak dept-3, tapi dept-3 sudah anak dept-2 yang
        // adalah anak dept-1 -- akan membentuk siklus dept-1 -> dept-3 -> dept-2 -> dept-1.
        const chain = { "dept-3": "dept-2", "dept-2": "dept-1" };
        await expect((0, department_hierarchy_1.assertNoParentCycle)("dept-1", "dept-3", chainLookup(chain))).rejects.toThrow(department_hierarchy_1.DepartmentCycleError);
    });
    it("rantai leluhur panjang tanpa siklus -> lolos", async () => {
        const chain = { "dept-5": "dept-4", "dept-4": "dept-3", "dept-3": "dept-2", "dept-2": null };
        await expect((0, department_hierarchy_1.assertNoParentCycle)("dept-1", "dept-5", chainLookup(chain))).resolves.toBeUndefined();
    });
});
