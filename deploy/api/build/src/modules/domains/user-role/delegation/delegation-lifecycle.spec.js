"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const delegation_lifecycle_1 = require("./delegation-lifecycle");
const d = (s) => new Date(s);
describe("assertNoDelegationOverlap() — BR-07", () => {
    it("tidak throw kalau tidak ada existing delegation", () => {
        expect(() => (0, delegation_lifecycle_1.assertNoDelegationOverlap)({ dateFrom: d("2026-08-01"), dateTo: d("2026-08-10") }, [])).not.toThrow();
    });
    it("tidak throw kalau rentang baru sepenuhnya SEBELUM existing", () => {
        expect(() => (0, delegation_lifecycle_1.assertNoDelegationOverlap)({ dateFrom: d("2026-08-01"), dateTo: d("2026-08-05") }, [
            { dateFrom: d("2026-08-06"), dateTo: d("2026-08-10") },
        ])).not.toThrow();
    });
    it("tidak throw kalau rentang baru sepenuhnya SESUDAH existing", () => {
        expect(() => (0, delegation_lifecycle_1.assertNoDelegationOverlap)({ dateFrom: d("2026-08-11"), dateTo: d("2026-08-15") }, [
            { dateFrom: d("2026-08-01"), dateTo: d("2026-08-10") },
        ])).not.toThrow();
    });
    it("throw DelegationOverlapError kalau rentang baru overlap penuh dgn existing", () => {
        expect(() => (0, delegation_lifecycle_1.assertNoDelegationOverlap)({ dateFrom: d("2026-08-03"), dateTo: d("2026-08-07") }, [
            { dateFrom: d("2026-08-01"), dateTo: d("2026-08-10") },
        ])).toThrow(delegation_lifecycle_1.DelegationOverlapError);
    });
    it("throw kalau rentang baru overlap SEBAGIAN (ujung awal existing)", () => {
        expect(() => (0, delegation_lifecycle_1.assertNoDelegationOverlap)({ dateFrom: d("2026-07-28"), dateTo: d("2026-08-03") }, [
            { dateFrom: d("2026-08-01"), dateTo: d("2026-08-10") },
        ])).toThrow(delegation_lifecycle_1.DelegationOverlapError);
    });
    it("throw kalau tanggal PERSIS bersinggungan satu hari (rentang tertutup, inklusif)", () => {
        expect(() => (0, delegation_lifecycle_1.assertNoDelegationOverlap)({ dateFrom: d("2026-08-10"), dateTo: d("2026-08-15") }, [
            { dateFrom: d("2026-08-01"), dateTo: d("2026-08-10") },
        ])).toThrow(delegation_lifecycle_1.DelegationOverlapError);
    });
    it("cek terhadap SELURUH existing (bukan cuma yang pertama)", () => {
        expect(() => (0, delegation_lifecycle_1.assertNoDelegationOverlap)({ dateFrom: d("2026-09-01"), dateTo: d("2026-09-05") }, [
            { dateFrom: d("2026-08-01"), dateTo: d("2026-08-10") },
            { dateFrom: d("2026-09-03"), dateTo: d("2026-09-10") },
        ])).toThrow(delegation_lifecycle_1.DelegationOverlapError);
    });
});
describe("findDelegationsToActivate()", () => {
    it("mengembalikan delegasi yang date_from-nya sudah tercapai", () => {
        const candidates = [
            { delegationId: "a", dateFrom: d("2026-08-01") },
            { delegationId: "b", dateFrom: d("2026-08-20") },
        ];
        const result = (0, delegation_lifecycle_1.findDelegationsToActivate)(candidates, d("2026-08-10"));
        expect(result.map((c) => c.delegationId)).toEqual(["a"]);
    });
    it("date_from PERSIS hari ini juga dianggap tercapai (inklusif)", () => {
        const candidates = [{ delegationId: "a", dateFrom: d("2026-08-10") }];
        const result = (0, delegation_lifecycle_1.findDelegationsToActivate)(candidates, d("2026-08-10"));
        expect(result).toHaveLength(1);
    });
});
describe("findDelegationsToExpire()", () => {
    it("mengembalikan delegasi yang date_to-nya sudah terlewati", () => {
        const candidates = [
            { delegationId: "a", dateTo: d("2026-08-01") },
            { delegationId: "b", dateTo: d("2026-08-20") },
        ];
        const result = (0, delegation_lifecycle_1.findDelegationsToExpire)(candidates, d("2026-08-10"));
        expect(result.map((c) => c.delegationId)).toEqual(["a"]);
    });
    it("date_to PERSIS hari ini BELUM dianggap terlewati (masih berlaku sampai akhir hari itu)", () => {
        const candidates = [{ delegationId: "a", dateTo: d("2026-08-10") }];
        const result = (0, delegation_lifecycle_1.findDelegationsToExpire)(candidates, d("2026-08-10"));
        expect(result).toHaveLength(0);
    });
});
