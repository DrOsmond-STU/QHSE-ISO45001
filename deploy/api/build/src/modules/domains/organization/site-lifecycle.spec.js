"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const site_lifecycle_1 = require("./site-lifecycle");
describe("validateSiteLifecycle", () => {
    it("BR-01: PROJECT tanpa start_date -> throw", () => {
        expect(() => (0, site_lifecycle_1.validateSiteLifecycle)({ siteType: "PROJECT", startDate: null, endDate: null, status: "ACTIVE" })).toThrow(site_lifecycle_1.SiteLifecycleError);
    });
    it("BR-01: PROJECT dengan start_date -> lolos", () => {
        expect(() => (0, site_lifecycle_1.validateSiteLifecycle)({ siteType: "PROJECT", startDate: new Date(), endDate: null, status: "ACTIVE" })).not.toThrow();
    });
    it("BR-01: PERMANENT tanpa start_date -> lolos (BR-01 cuma wajib utk PROJECT)", () => {
        expect(() => (0, site_lifecycle_1.validateSiteLifecycle)({ siteType: "PERMANENT", startDate: null, endDate: null, status: "ACTIVE" })).not.toThrow();
    });
    it("BR-01: status ARCHIVED tanpa end_date -> throw", () => {
        expect(() => (0, site_lifecycle_1.validateSiteLifecycle)({ siteType: "PROJECT", startDate: new Date(), endDate: null, status: "ARCHIVED" })).toThrow(site_lifecycle_1.SiteLifecycleError);
    });
    it("BR-01: status ARCHIVED dengan end_date -> lolos", () => {
        expect(() => (0, site_lifecycle_1.validateSiteLifecycle)({ siteType: "PROJECT", startDate: new Date(), endDate: new Date(), status: "ARCHIVED" })).not.toThrow();
    });
    it("BR-01: status ACTIVE tanpa end_date -> lolos (end_date cuma wajib sebelum ARCHIVED)", () => {
        expect(() => (0, site_lifecycle_1.validateSiteLifecycle)({ siteType: "PROJECT", startDate: new Date(), endDate: null, status: "ACTIVE" })).not.toThrow();
    });
});
describe("shouldWarnMissingGeoCoordinates", () => {
    it("BR-08: kategori RIG tanpa geo -> warning true", () => {
        expect((0, site_lifecycle_1.shouldWarnMissingGeoCoordinates)("RIG", null, null)).toBe(true);
    });
    it("BR-08: kategori MINE_SITE tanpa geo_long saja -> warning true", () => {
        expect((0, site_lifecycle_1.shouldWarnMissingGeoCoordinates)("MINE_SITE", -1.2, null)).toBe(true);
    });
    it("BR-08: kategori CONSTRUCTION_SITE dengan geo lengkap -> warning false", () => {
        expect((0, site_lifecycle_1.shouldWarnMissingGeoCoordinates)("CONSTRUCTION_SITE", -1.2, 116.8)).toBe(false);
    });
    it("BR-08: kategori bukan berisiko tinggi (OFFICE) tanpa geo -> warning false (tidak direkomendasikan utk kategori ini)", () => {
        expect((0, site_lifecycle_1.shouldWarnMissingGeoCoordinates)("OFFICE", null, null)).toBe(false);
    });
});
