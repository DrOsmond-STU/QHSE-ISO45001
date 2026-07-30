import { Injectable } from "@nestjs/common";
import { EmergencyContact, EmergencyContactCategory } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./emergency-response-context";

export interface CreateEmergencyContactInput {
  siteId?: string; // NULL = lingkup company-wide (PRD §5)
  contactCategory: EmergencyContactCategory;
  contactName: string;
  organizationName?: string;
  phonePrimary: string;
  phoneSecondary?: string;
  email?: string;
  address?: string;
  distanceFromSiteKm?: number;
  estimatedResponseTimeMinutes?: number;
  is24x7?: boolean;
  notes?: string;
}

// Task 3.7 (Modul 14 §3 "Tenant Admin | emergency_response.contact.configure").
// Direktori kontak darurat internal/eksternal — bersifat INFORMASI RUJUKAN
// bagi ERT (PRD §2.2 Non-Goals: "Dispatch otomatis ke layanan darurat
// eksternal" TIDAK di-cover, TIDAK ada integrasi API apa pun ke pihak
// ketiga). BELUM ada controller HTTP.
@Injectable()
export class EmergencyContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateEmergencyContactInput): Promise<EmergencyContact> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.emergencyContact.create({
        data: {
          tenantId,
          siteId: input.siteId,
          contactCategory: input.contactCategory,
          contactName: input.contactName,
          organizationName: input.organizationName,
          phonePrimary: input.phonePrimary,
          phoneSecondary: input.phoneSecondary,
          email: input.email,
          address: input.address,
          distanceFromSiteKm: input.distanceFromSiteKm,
          estimatedResponseTimeMinutes: input.estimatedResponseTimeMinutes,
          is24x7: input.is24x7 ?? false,
          isActive: true,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async getById(emergencyContactId: string): Promise<EmergencyContact> {
    return this.prisma.withRls((tx) => tx.emergencyContact.findUniqueOrThrow({ where: { id: emergencyContactId } }));
  }

  /** siteId opsional (PRD §5 "nullable utk kontak lingkup company-wide") —
   * ADA kalau caller mau kontak khusus site TERTENTU + yang company-wide
   * SEKALIGUS, TIDAK ADA kalau caller mau seluruh katalog tenant. */
  async listActive(siteId?: string): Promise<EmergencyContact[]> {
    return this.prisma.withRls((tx) =>
      tx.emergencyContact.findMany({
        where: siteId ? { isActive: true, deletedAt: null, OR: [{ siteId }, { siteId: null }] } : { isActive: true, deletedAt: null },
        orderBy: [{ contactCategory: "asc" }, { contactName: "asc" }],
      }),
    );
  }

  async deactivate(emergencyContactId: string): Promise<EmergencyContact> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.emergencyContact.update({ where: { id: emergencyContactId }, data: { isActive: false, updatedBy } }),
    );
  }
}
