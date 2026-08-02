
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('@prisma/client/runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.RlsSmokeTestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  label: 'label'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employeeId: 'employeeId',
  email: 'email',
  username: 'username',
  fullName: 'fullName',
  phoneNumber: 'phoneNumber',
  userType: 'userType',
  departmentId: 'departmentId',
  siteId: 'siteId',
  positionId: 'positionId',
  jobTitle: 'jobTitle',
  reportingToUserId: 'reportingToUserId',
  status: 'status',
  invitedAt: 'invitedAt',
  activatedAt: 'activatedAt',
  suspendedAt: 'suspendedAt',
  deactivatedAt: 'deactivatedAt',
  passwordHash: 'passwordHash',
  mfaEnabled: 'mfaEnabled',
  mfaSecretEncrypted: 'mfaSecretEncrypted',
  failedLoginAttempts: 'failedLoginAttempts',
  lockedUntil: 'lockedUntil',
  preferredLanguage: 'preferredLanguage',
  avatarUrl: 'avatarUrl',
  hrisSyncSource: 'hrisSyncSource',
  hrisLastSyncedAt: 'hrisLastSyncedAt',
  lastLoginAt: 'lastLoginAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SessionCacheEntryScalarFieldEnum = {
  userId: 'userId',
  sessionId: 'sessionId',
  tenantId: 'tenantId',
  currentSecretHash: 'currentSecretHash',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuthorizationCodeEntryScalarFieldEnum = {
  code: 'code',
  userId: 'userId',
  tenantId: 'tenantId',
  codeChallenge: 'codeChallenge',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.UserSessionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  loginAt: 'loginAt',
  logoutAt: 'logoutAt',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  deviceType: 'deviceType',
  sessionTokenHash: 'sessionTokenHash',
  expiresAt: 'expiresAt',
  revoked: 'revoked',
  revokedReason: 'revokedReason',
  createdAt: 'createdAt'
};

exports.Prisma.PasswordPolicyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  minLength: 'minLength',
  requireUppercase: 'requireUppercase',
  requireLowercase: 'requireLowercase',
  requireNumber: 'requireNumber',
  requireSpecialChar: 'requireSpecialChar',
  passwordExpiryDays: 'passwordExpiryDays',
  passwordHistoryCount: 'passwordHistoryCount',
  maxFailedAttempts: 'maxFailedAttempts',
  lockoutDurationMinutes: 'lockoutDurationMinutes',
  mfaRequired: 'mfaRequired',
  sessionTimeoutMinutes: 'sessionTimeoutMinutes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  roleCode: 'roleCode',
  name: 'name',
  description: 'description',
  isSystemRole: 'isSystemRole',
  basedOnRoleId: 'basedOnRoleId',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.PermissionGroupScalarFieldEnum = {
  id: 'id',
  moduleCode: 'moduleCode',
  name: 'name',
  sequenceNo: 'sequenceNo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  permissionCode: 'permissionCode',
  moduleCode: 'moduleCode',
  entity: 'entity',
  action: 'action',
  permissionGroupId: 'permissionGroupId',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  roleId: 'roleId',
  permissionId: 'permissionId',
  scopeConstraint: 'scopeConstraint',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.UserRoleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  roleId: 'roleId',
  scopeType: 'scopeType',
  scopeId: 'scopeId',
  validFrom: 'validFrom',
  validTo: 'validTo',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SsoMappingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  idpProvider: 'idpProvider',
  idpTenantIdentifier: 'idpTenantIdentifier',
  externalSubjectId: 'externalSubjectId',
  externalEmail: 'externalEmail',
  autoProvision: 'autoProvision',
  defaultRoleIdOnProvision: 'defaultRoleIdOnProvision',
  status: 'status',
  lastSsoLoginAt: 'lastSsoLoginAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DelegationOfAuthorityScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  delegatorUserId: 'delegatorUserId',
  delegateUserId: 'delegateUserId',
  scopeType: 'scopeType',
  scopeId: 'scopeId',
  roleId: 'roleId',
  reason: 'reason',
  dateFrom: 'dateFrom',
  dateTo: 'dateTo',
  status: 'status',
  approvedBy: 'approvedBy',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WorkflowDefinitionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  moduleCode: 'moduleCode',
  name: 'name',
  isActive: 'isActive',
  version: 'version',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowStageScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workflowDefinitionId: 'workflowDefinitionId',
  sequenceNo: 'sequenceNo',
  stageName: 'stageName',
  approverType: 'approverType',
  approverRoleId: 'approverRoleId',
  approverUserId: 'approverUserId',
  slaHours: 'slaHours',
  escalationAction: 'escalationAction',
  escalationRoleId: 'escalationRoleId',
  allowDelegation: 'allowDelegation',
  isParallelGroup: 'isParallelGroup',
  parallelCompletionRule: 'parallelCompletionRule',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowTransitionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workflowDefinitionId: 'workflowDefinitionId',
  fromStageId: 'fromStageId',
  toStageId: 'toStageId',
  triggerAction: 'triggerAction',
  condition: 'condition',
  priority: 'priority',
  resultStatus: 'resultStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowInstanceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workflowDefinitionId: 'workflowDefinitionId',
  entityType: 'entityType',
  entityId: 'entityId',
  currentStageId: 'currentStageId',
  status: 'status',
  contextData: 'contextData',
  startedAt: 'startedAt',
  completedAt: 'completedAt'
};

exports.Prisma.WorkflowTaskScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  instanceId: 'instanceId',
  stageId: 'stageId',
  assignedTo: 'assignedTo',
  status: 'status',
  comment: 'comment',
  actedAt: 'actedAt',
  actedBy: 'actedBy',
  delegatedTo: 'delegatedTo',
  escalatedAt: 'escalatedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowDelegationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  delegatorUserId: 'delegatorUserId',
  delegateUserId: 'delegateUserId',
  roleId: 'roleId',
  scopeType: 'scopeType',
  scopeId: 'scopeId',
  dateFrom: 'dateFrom',
  dateTo: 'dateTo',
  isActive: 'isActive',
  sourceDelegationOfAuthorityId: 'sourceDelegationOfAuthorityId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NumberingConfigScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  moduleCode: 'moduleCode',
  pattern: 'pattern',
  prefix: 'prefix',
  resetPeriod: 'resetPeriod',
  scopeLevel: 'scopeLevel',
  scopeId: 'scopeId',
  lastSequence: 'lastSequence',
  lastPeriodKey: 'lastPeriodKey',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  recipientUserId: 'recipientUserId',
  eventType: 'eventType',
  entityType: 'entityType',
  entityId: 'entityId',
  title: 'title',
  body: 'body',
  priority: 'priority',
  isRead: 'isRead',
  readAt: 'readAt',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationChannelScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  channelCode: 'channelCode',
  isEnabled: 'isEnabled',
  providerConfigRef: 'providerConfigRef'
};

exports.Prisma.NotificationTemplateScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  eventType: 'eventType',
  channelCode: 'channelCode',
  language: 'language',
  subjectTemplate: 'subjectTemplate',
  bodyTemplate: 'bodyTemplate',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationPreferenceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  eventCategory: 'eventCategory',
  channelCode: 'channelCode',
  isEnabled: 'isEnabled',
  deliveryMode: 'deliveryMode',
  quietHoursStart: 'quietHoursStart',
  quietHoursEnd: 'quietHoursEnd'
};

exports.Prisma.NotificationLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  notificationId: 'notificationId',
  channelCode: 'channelCode',
  status: 'status',
  providerMessageId: 'providerMessageId',
  providerResponse: 'providerResponse',
  attemptCount: 'attemptCount',
  sentAt: 'sentAt',
  createdAt: 'createdAt',
  recipientAddress: 'recipientAddress',
  subject: 'subject',
  body: 'body',
  nextAttemptAt: 'nextAttemptAt'
};

exports.Prisma.AttachmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  entityType: 'entityType',
  entityId: 'entityId',
  fileName: 'fileName',
  fileUrl: 'fileUrl',
  fileSize: 'fileSize',
  mimeType: 'mimeType',
  scanStatus: 'scanStatus',
  thumbnailUrl: 'thumbnailUrl',
  uploadedBy: 'uploadedBy',
  uploadedAt: 'uploadedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemAuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  actorUserId: 'actorUserId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  beforeValue: 'beforeValue',
  afterValue: 'afterValue',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  correlationId: 'correlationId',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogSmokeTestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  label: 'label'
};

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  tenantCode: 'tenantCode',
  legalName: 'legalName',
  displayName: 'displayName',
  industryTemplateId: 'industryTemplateId',
  taxId: 'taxId',
  primaryDomain: 'primaryDomain',
  defaultTimezone: 'defaultTimezone',
  defaultLanguage: 'defaultLanguage',
  deploymentMode: 'deploymentMode',
  dataResidencyRegion: 'dataResidencyRegion',
  status: 'status',
  trialEndsAt: 'trialEndsAt',
  activatedAt: 'activatedAt',
  suspendedAt: 'suspendedAt',
  logoUrl: 'logoUrl',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CompanyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyCode: 'companyCode',
  legalName: 'legalName',
  displayName: 'displayName',
  businessRegistrationNo: 'businessRegistrationNo',
  taxId: 'taxId',
  industryTemplateId: 'industryTemplateId',
  locationId: 'locationId',
  effectiveDate: 'effectiveDate',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.BranchScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchCode: 'branchCode',
  name: 'name',
  branchType: 'branchType',
  locationId: 'locationId',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SiteScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteCode: 'siteCode',
  name: 'name',
  siteType: 'siteType',
  category: 'category',
  startDate: 'startDate',
  endDate: 'endDate',
  actualClosureDate: 'actualClosureDate',
  locationId: 'locationId',
  geoLat: 'geoLat',
  geoLong: 'geoLong',
  timezone: 'timezone',
  holidayCalendarId: 'holidayCalendarId',
  riskProfile: 'riskProfile',
  autoArchiveOnEndDate: 'autoArchiveOnEndDate',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  parentDepartmentId: 'parentDepartmentId',
  departmentCode: 'departmentCode',
  name: 'name',
  departmentType: 'departmentType',
  costCenterId: 'costCenterId',
  headUserId: 'headUserId',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CostCenterScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  costCenterCode: 'costCenterCode',
  name: 'name',
  glAccountRef: 'glAccountRef',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.LocationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  village: 'village',
  district: 'district',
  cityRegency: 'cityRegency',
  province: 'province',
  postalCode: 'postalCode',
  country: 'country',
  geoLat: 'geoLat',
  geoLong: 'geoLong',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.OrganizationChartScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  departmentId: 'departmentId',
  positionCode: 'positionCode',
  positionTitle: 'positionTitle',
  reportsToPositionId: 'reportsToPositionId',
  isManagementPosition: 'isManagementPosition',
  headcountPlanned: 'headcountPlanned',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IndustryTemplateScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  defaultRegulatoryCodes: 'defaultRegulatoryCodes',
  defaultChecklistRefs: 'defaultChecklistRefs',
  defaultModuleEntitlements: 'defaultModuleEntitlements',
  isSystemDefined: 'isSystemDefined',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HolidayCalendarScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  appliesToSiteId: 'appliesToSiteId',
  country: 'country',
  isDefault: 'isDefault',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.HolidayCalendarEntryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  holidayCalendarId: 'holidayCalendarId',
  holidayDate: 'holidayDate',
  name: 'name',
  isRecurringYearly: 'isRecurringYearly',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionPlanScalarFieldEnum = {
  id: 'id',
  planName: 'planName',
  includedModuleCodes: 'includedModuleCodes',
  maxUsers: 'maxUsers',
  maxSites: 'maxSites',
  isActive: 'isActive'
};

exports.Prisma.TenantSubscriptionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  subscriptionPlanId: 'subscriptionPlanId',
  billingPeriod: 'billingPeriod',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ModuleEntitlementScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  moduleCode: 'moduleCode',
  isEnabled: 'isEnabled',
  overrideReason: 'overrideReason',
  overriddenBy: 'overriddenBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UsageCounterScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  metricType: 'metricType',
  currentValue: 'currentValue',
  measuredAt: 'measuredAt'
};

exports.Prisma.DataImportJobScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  targetModuleCode: 'targetModuleCode',
  fileUrl: 'fileUrl',
  status: 'status',
  totalRows: 'totalRows',
  successRows: 'successRows',
  errorRows: 'errorRows',
  initiatedBy: 'initiatedBy',
  sourceDataImportJobId: 'sourceDataImportJobId',
  createdAt: 'createdAt',
  completedAt: 'completedAt'
};

exports.Prisma.DataImportErrorScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  dataImportJobId: 'dataImportJobId',
  rowNumber: 'rowNumber',
  errorMessage: 'errorMessage',
  rawRowData: 'rawRowData',
  createdAt: 'createdAt'
};

exports.Prisma.TenantBrandingConfigScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  logoUrl: 'logoUrl',
  primaryColor: 'primaryColor',
  displayName: 'displayName',
  customDomain: 'customDomain',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentCategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  code: 'code',
  parentCategoryId: 'parentCategoryId',
  defaultNumberingConfigId: 'defaultNumberingConfigId',
  defaultReviewCycleMonths: 'defaultReviewCycleMonths',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  documentNumber: 'documentNumber',
  title: 'title',
  documentType: 'documentType',
  documentCategoryId: 'documentCategoryId',
  classification: 'classification',
  description: 'description',
  ownerUserId: 'ownerUserId',
  ownerDepartmentId: 'ownerDepartmentId',
  currentVersionId: 'currentVersionId',
  status: 'status',
  effectiveDate: 'effectiveDate',
  reviewCycleMonths: 'reviewCycleMonths',
  nextReviewDate: 'nextReviewDate',
  retentionYears: 'retentionYears',
  relatedRegulatoryRefs: 'relatedRegulatoryRefs',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DocumentVersionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  documentId: 'documentId',
  majorVersion: 'majorVersion',
  minorVersion: 'minorVersion',
  fileName: 'fileName',
  fileUrl: 'fileUrl',
  fileSize: 'fileSize',
  mimeType: 'mimeType',
  changeSummary: 'changeSummary',
  status: 'status',
  supersededByVersionId: 'supersededByVersionId',
  approvedAt: 'approvedAt',
  publishedAt: 'publishedAt',
  workflowInstanceId: 'workflowInstanceId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DocumentDistributionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  documentId: 'documentId',
  documentVersionId: 'documentVersionId',
  distributionTargetType: 'distributionTargetType',
  distributionTargetId: 'distributionTargetId',
  requiresAcknowledgement: 'requiresAcknowledgement',
  acknowledgementDueDays: 'acknowledgementDueDays',
  distributedAt: 'distributedAt',
  distributedBy: 'distributedBy',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ReadAcknowledgementLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  documentDistributionId: 'documentDistributionId',
  documentVersionId: 'documentVersionId',
  userId: 'userId',
  status: 'status',
  viewedAt: 'viewedAt',
  acknowledgedAt: 'acknowledgedAt',
  acknowledgementMethod: 'acknowledgementMethod',
  eSignatureRef: 'eSignatureRef',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentReviewScheduleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  documentId: 'documentId',
  scheduledReviewDate: 'scheduledReviewDate',
  actualReviewDate: 'actualReviewDate',
  reviewerUserId: 'reviewerUserId',
  reviewOutcome: 'reviewOutcome',
  resultingDocumentVersionId: 'resultingDocumentVersionId',
  status: 'status',
  reviewReminderSentAt: 'reviewReminderSentAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.RegulatoryFrameworkScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  category: 'category',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RegulatoryRegisterScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  frameworkId: 'frameworkId',
  regulationType: 'regulationType',
  regulationNumber: 'regulationNumber',
  title: 'title',
  issuingAuthority: 'issuingAuthority',
  issueDate: 'issueDate',
  effectiveDate: 'effectiveDate',
  applicableScope: 'applicableScope',
  applicableCompanyId: 'applicableCompanyId',
  applicableSiteId: 'applicableSiteId',
  industryRelevance: 'industryRelevance',
  summary: 'summary',
  sourceUrl: 'sourceUrl',
  status: 'status',
  supersededByRegisterId: 'supersededByRegisterId',
  reviewCycleMonths: 'reviewCycleMonths',
  nextReviewDate: 'nextReviewDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ComplianceObligationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  regulatoryRegisterId: 'regulatoryRegisterId',
  obligationCode: 'obligationCode',
  clauseReference: 'clauseReference',
  obligationDescription: 'obligationDescription',
  obligationType: 'obligationType',
  responsibleUserId: 'responsibleUserId',
  responsibleDepartmentId: 'responsibleDepartmentId',
  applicableSiteId: 'applicableSiteId',
  frequency: 'frequency',
  nextDueDate: 'nextDueDate',
  status: 'status',
  dueReminderSentAt: 'dueReminderSentAt',
  overdueNotifiedAt: 'overdueNotifiedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ComplianceEvaluationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  evaluationNumber: 'evaluationNumber',
  regulatoryRegisterId: 'regulatoryRegisterId',
  obligationId: 'obligationId',
  siteId: 'siteId',
  evaluationPeriodStart: 'evaluationPeriodStart',
  evaluationPeriodEnd: 'evaluationPeriodEnd',
  evaluatorUserId: 'evaluatorUserId',
  evaluationDate: 'evaluationDate',
  evaluationMethod: 'evaluationMethod',
  complianceStatus: 'complianceStatus',
  findingsSummary: 'findingsSummary',
  capaTriggered: 'capaTriggered',
  linkedCapaId: 'linkedCapaId',
  nextEvaluationDueDate: 'nextEvaluationDueDate',
  status: 'status',
  workflowInstanceId: 'workflowInstanceId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.LicensePermitScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  siteId: 'siteId',
  licenseNumber: 'licenseNumber',
  licenseName: 'licenseName',
  licenseType: 'licenseType',
  issuingAuthority: 'issuingAuthority',
  regulatoryRegisterId: 'regulatoryRegisterId',
  holderType: 'holderType',
  holderReferenceId: 'holderReferenceId',
  issueDate: 'issueDate',
  expiryDate: 'expiryDate',
  renewalLeadTimeDays: 'renewalLeadTimeDays',
  status: 'status',
  expiryReminder90SentAt: 'expiryReminder90SentAt',
  expiryReminder30SentAt: 'expiryReminder30SentAt',
  expiryReminder7SentAt: 'expiryReminder7SentAt',
  renewalOfLicenseId: 'renewalOfLicenseId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.RiskMatrixConfigScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  applicableModuleScope: 'applicableModuleScope',
  likelihoodLevels: 'likelihoodLevels',
  severityLevels: 'severityLevels',
  version: 'version',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.RiskMatrixLevelScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  riskMatrixConfigId: 'riskMatrixConfigId',
  axis: 'axis',
  levelValue: 'levelValue',
  label: 'label',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RiskMatrixCellScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  riskMatrixConfigId: 'riskMatrixConfigId',
  likelihoodValue: 'likelihoodValue',
  severityValue: 'severityValue',
  riskScore: 'riskScore',
  riskLevel: 'riskLevel',
  colorCode: 'colorCode',
  requiredActionDescription: 'requiredActionDescription',
  requiresEscalation: 'requiresEscalation',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HazardRegisterScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  hazardCode: 'hazardCode',
  hazardCategory: 'hazardCategory',
  hazardDescription: 'hazardDescription',
  potentialConsequence: 'potentialConsequence',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.HiraAssessmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  hiraNumber: 'hiraNumber',
  siteId: 'siteId',
  departmentId: 'departmentId',
  activityDescription: 'activityDescription',
  assessmentType: 'assessmentType',
  riskMatrixConfigId: 'riskMatrixConfigId',
  assessmentDate: 'assessmentDate',
  reviewDueDate: 'reviewDueDate',
  status: 'status',
  reviewReminderSentAt: 'reviewReminderSentAt',
  workflowInstanceId: 'workflowInstanceId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.HiraTeamMemberScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  hiraId: 'hiraId',
  userId: 'userId',
  roleInTeam: 'roleInTeam',
  createdAt: 'createdAt'
};

exports.Prisma.HiraHazardLineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  hiraId: 'hiraId',
  hazardId: 'hazardId',
  hazardDescriptionFreetext: 'hazardDescriptionFreetext',
  existingControls: 'existingControls',
  likelihoodBefore: 'likelihoodBefore',
  severityBefore: 'severityBefore',
  riskScoreBefore: 'riskScoreBefore',
  riskLevelBefore: 'riskLevelBefore',
  additionalControlsRequired: 'additionalControlsRequired',
  controlHierarchy: 'controlHierarchy',
  likelihoodAfter: 'likelihoodAfter',
  severityAfter: 'severityAfter',
  riskScoreAfter: 'riskScoreAfter',
  riskLevelAfter: 'riskLevelAfter',
  requiresEscalation: 'requiresEscalation',
  responsibleUserId: 'responsibleUserId',
  targetCompletionDate: 'targetCompletionDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.JsaRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  jsaNumber: 'jsaNumber',
  siteId: 'siteId',
  departmentId: 'departmentId',
  jobTitle: 'jobTitle',
  jobDescription: 'jobDescription',
  preparedBy: 'preparedBy',
  reviewedBy: 'reviewedBy',
  assessmentDate: 'assessmentDate',
  validUntil: 'validUntil',
  linkedHiraId: 'linkedHiraId',
  status: 'status',
  workflowInstanceId: 'workflowInstanceId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.JsaJobStepScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  jsaId: 'jsaId',
  sequenceNo: 'sequenceNo',
  stepDescription: 'stepDescription',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JsaStepHazardScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  jsaStepId: 'jsaStepId',
  hazardId: 'hazardId',
  hazardDescriptionFreetext: 'hazardDescriptionFreetext',
  potentialRisk: 'potentialRisk',
  controlMeasures: 'controlMeasures',
  ppeRequired: 'ppeRequired',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JsaCrewAcknowledgementScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  jsaId: 'jsaId',
  userId: 'userId',
  workDate: 'workDate',
  acknowledgedAt: 'acknowledgedAt',
  signatureRef: 'signatureRef',
  createdAt: 'createdAt'
};

exports.Prisma.HiradcRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  hiradcNumber: 'hiradcNumber',
  siteId: 'siteId',
  departmentId: 'departmentId',
  relatedHiraId: 'relatedHiraId',
  relatedJsaId: 'relatedJsaId',
  workPermitId: 'workPermitId',
  taskDescription: 'taskDescription',
  performedBy: 'performedBy',
  assessmentDatetime: 'assessmentDatetime',
  status: 'status',
  validUntil: 'validUntil',
  workflowInstanceId: 'workflowInstanceId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.HiradcLineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  hiradcId: 'hiradcId',
  hazardId: 'hazardId',
  hazardDescriptionFreetext: 'hazardDescriptionFreetext',
  likelihood: 'likelihood',
  severity: 'severity',
  riskScore: 'riskScore',
  riskLevel: 'riskLevel',
  requiresEscalation: 'requiresEscalation',
  controlMeasures: 'controlMeasures',
  ppeRequired: 'ppeRequired',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.RiskRegisterScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  riskNumber: 'riskNumber',
  companyId: 'companyId',
  riskCategory: 'riskCategory',
  riskTitle: 'riskTitle',
  riskDescription: 'riskDescription',
  riskOwnerUserId: 'riskOwnerUserId',
  riskMatrixConfigId: 'riskMatrixConfigId',
  likelihoodInherent: 'likelihoodInherent',
  severityInherent: 'severityInherent',
  riskScoreInherent: 'riskScoreInherent',
  riskLevelInherent: 'riskLevelInherent',
  currentControls: 'currentControls',
  likelihoodResidual: 'likelihoodResidual',
  severityResidual: 'severityResidual',
  riskScoreResidual: 'riskScoreResidual',
  riskLevelResidual: 'riskLevelResidual',
  requiresEscalation: 'requiresEscalation',
  riskAppetiteStatus: 'riskAppetiteStatus',
  identifiedDate: 'identifiedDate',
  lastReviewDate: 'lastReviewDate',
  nextReviewDate: 'nextReviewDate',
  status: 'status',
  overdueNotifiedAt: 'overdueNotifiedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.RiskTreatmentPlanScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  treatmentStrategy: 'treatmentStrategy',
  treatmentDescription: 'treatmentDescription',
  responsibleUserId: 'responsibleUserId',
  targetDate: 'targetDate',
  actionTrackingId: 'actionTrackingId',
  capaId: 'capaId',
  status: 'status',
  effectivenessReviewNotes: 'effectivenessReviewNotes',
  overdueNotifiedAt: 'overdueNotifiedAt',
  topManagementApprovedBy: 'topManagementApprovedBy',
  topManagementApprovedAt: 'topManagementApprovedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WorkPermitTypeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  description: 'description',
  requiresGasTest: 'requiresGasTest',
  requiresLoto: 'requiresLoto',
  requiresHseApproval: 'requiresHseApproval',
  defaultRiskLevel: 'defaultRiskLevel',
  defaultValidityHours: 'defaultValidityHours',
  maxExtensionCount: 'maxExtensionCount',
  gasRetestIntervalHours: 'gasRetestIntervalHours',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WorkPermitScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  permitNumber: 'permitNumber',
  workPermitTypeId: 'workPermitTypeId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  title: 'title',
  description: 'description',
  locationDetail: 'locationDetail',
  requesterId: 'requesterId',
  contractorCompanyId: 'contractorCompanyId',
  relatedJsaId: 'relatedJsaId',
  riskLevel: 'riskLevel',
  plannedStartDatetime: 'plannedStartDatetime',
  plannedEndDatetime: 'plannedEndDatetime',
  actualStartDatetime: 'actualStartDatetime',
  actualEndDatetime: 'actualEndDatetime',
  numberOfWorkers: 'numberOfWorkers',
  status: 'status',
  workflowInstanceId: 'workflowInstanceId',
  customFields: 'customFields',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WorkPermitHazardChecklistScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workPermitId: 'workPermitId',
  customFields: 'customFields',
  allMandatoryItemsChecked: 'allMandatoryItemsChecked',
  completedBy: 'completedBy',
  completedAt: 'completedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.GasTestResultScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workPermitId: 'workPermitId',
  gasType: 'gasType',
  readingValue: 'readingValue',
  unit: 'unit',
  acceptableMin: 'acceptableMin',
  acceptableMax: 'acceptableMax',
  result: 'result',
  testDatetime: 'testDatetime',
  retestDueAt: 'retestDueAt',
  instrumentName: 'instrumentName',
  instrumentCalibrationRef: 'instrumentCalibrationRef',
  testedBy: 'testedBy',
  locationDetail: 'locationDetail',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IsolationLotoRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workPermitId: 'workPermitId',
  isolationPointDescription: 'isolationPointDescription',
  isolationType: 'isolationType',
  lockNumber: 'lockNumber',
  tagNumber: 'tagNumber',
  appliedBy: 'appliedBy',
  appliedAt: 'appliedAt',
  verifiedBy: 'verifiedBy',
  verifiedAt: 'verifiedAt',
  removedBy: 'removedBy',
  removedAt: 'removedAt',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WorkPermitApprovalScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workPermitId: 'workPermitId',
  workflowInstanceId: 'workflowInstanceId',
  currentStageName: 'currentStageName',
  issuerApprovedBy: 'issuerApprovedBy',
  issuerApprovedAt: 'issuerApprovedAt',
  hseApprovedBy: 'hseApprovedBy',
  hseApprovedAt: 'hseApprovedAt',
  finalDecision: 'finalDecision',
  rejectionReason: 'rejectionReason',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WorkPermitExtensionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workPermitId: 'workPermitId',
  requestedNewEndDatetime: 'requestedNewEndDatetime',
  reason: 'reason',
  gasRetestRequired: 'gasRetestRequired',
  workflowInstanceId: 'workflowInstanceId',
  status: 'status',
  requestedBy: 'requestedBy',
  requestedAt: 'requestedAt',
  decidedBy: 'decidedBy',
  decidedAt: 'decidedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WorkPermitClosureScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workPermitId: 'workPermitId',
  areaSafetyChecklist: 'areaSafetyChecklist',
  isolationRemovedConfirmed: 'isolationRemovedConfirmed',
  requesterSignoffBy: 'requesterSignoffBy',
  requesterSignoffAt: 'requesterSignoffAt',
  verifiedBy: 'verifiedBy',
  verifiedAt: 'verifiedAt',
  status: 'status',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IncidentReportScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  incidentNumber: 'incidentNumber',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  classification: 'classification',
  initialClassification: 'initialClassification',
  severityLevel: 'severityLevel',
  incidentDatetime: 'incidentDatetime',
  reportedDatetime: 'reportedDatetime',
  locationDetail: 'locationDetail',
  description: 'description',
  immediateActionTaken: 'immediateActionTaken',
  reportedBy: 'reportedBy',
  isAnonymous: 'isAnonymous',
  injuredPersonId: 'injuredPersonId',
  workPermitId: 'workPermitId',
  involvesContractor: 'involvesContractor',
  contractorCompanyId: 'contractorCompanyId',
  status: 'status',
  daysLost: 'daysLost',
  estimatedCost: 'estimatedCost',
  customFields: 'customFields',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IncidentInvestigationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  incidentReportId: 'incidentReportId',
  method: 'method',
  methodOtherDetail: 'methodOtherDetail',
  leadInvestigatorId: 'leadInvestigatorId',
  startedAt: 'startedAt',
  targetCompletionAt: 'targetCompletionAt',
  completedAt: 'completedAt',
  findingsSummary: 'findingsSummary',
  status: 'status',
  workflowInstanceId: 'workflowInstanceId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IncidentInvestigationTeamScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  incidentInvestigationId: 'incidentInvestigationId',
  userId: 'userId',
  roleInTeam: 'roleInTeam',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IncidentRootCauseScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  incidentInvestigationId: 'incidentInvestigationId',
  causeType: 'causeType',
  category: 'category',
  description: 'description',
  methodReference: 'methodReference',
  sequenceNo: 'sequenceNo',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IncidentCorrectiveActionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  incidentReportId: 'incidentReportId',
  incidentInvestigationId: 'incidentInvestigationId',
  capaRegisterId: 'capaRegisterId',
  capaStatusCache: 'capaStatusCache',
  linkedBy: 'linkedBy',
  linkedAt: 'linkedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IncidentWitnessStatementScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  incidentReportId: 'incidentReportId',
  witnessUserId: 'witnessUserId',
  witnessNameExternal: 'witnessNameExternal',
  statementText: 'statementText',
  statementDatetime: 'statementDatetime',
  recordedBy: 'recordedBy',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IncidentRegulatoryReportScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  incidentReportId: 'incidentReportId',
  regulatoryBody: 'regulatoryBody',
  reportType: 'reportType',
  requiredByDate: 'requiredByDate',
  submittedDate: 'submittedDate',
  officialReferenceNumber: 'officialReferenceNumber',
  status: 'status',
  submittedBy: 'submittedBy',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.IncidentStatisticsCacheScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  periodType: 'periodType',
  periodStartDate: 'periodStartDate',
  periodEndDate: 'periodEndDate',
  totalManhoursWorked: 'totalManhoursWorked',
  fatalityCount: 'fatalityCount',
  ltiCount: 'ltiCount',
  restrictedWorkCount: 'restrictedWorkCount',
  medicalTreatmentCount: 'medicalTreatmentCount',
  firstAidCount: 'firstAidCount',
  nearMissCount: 'nearMissCount',
  propertyDamageCount: 'propertyDamageCount',
  environmentalSpillCount: 'environmentalSpillCount',
  processSafetyEventCount: 'processSafetyEventCount',
  totalDaysLost: 'totalDaysLost',
  rateBaseHoursUsed: 'rateBaseHoursUsed',
  ltifr: 'ltifr',
  trir: 'trir',
  severityRate: 'severityRate',
  calculatedAt: 'calculatedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InspectionTypeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InspectionChecklistTemplateScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  inspectionTypeId: 'inspectionTypeId',
  name: 'name',
  version: 'version',
  scoringMethod: 'scoringMethod',
  passingScoreThreshold: 'passingScoreThreshold',
  isActive: 'isActive',
  effectiveDate: 'effectiveDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InspectionChecklistTemplateItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  inspectionChecklistTemplateId: 'inspectionChecklistTemplateId',
  sequenceNo: 'sequenceNo',
  itemText: 'itemText',
  category: 'category',
  responseType: 'responseType',
  weight: 'weight',
  isMandatory: 'isMandatory',
  requiresPhotoIfFail: 'requiresPhotoIfFail',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InspectionScheduleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  inspectionChecklistTemplateId: 'inspectionChecklistTemplateId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  recurrencePattern: 'recurrencePattern',
  recurrenceDetail: 'recurrenceDetail',
  defaultAssignedInspectorId: 'defaultAssignedInspectorId',
  startDate: 'startDate',
  endDate: 'endDate',
  isActive: 'isActive',
  nextGenerationDate: 'nextGenerationDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InspectionRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  inspectionRecordNumber: 'inspectionRecordNumber',
  inspectionScheduleId: 'inspectionScheduleId',
  inspectionChecklistTemplateId: 'inspectionChecklistTemplateId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  plannedDate: 'plannedDate',
  actualDate: 'actualDate',
  inspectorId: 'inspectorId',
  status: 'status',
  overallScore: 'overallScore',
  overallResult: 'overallResult',
  notes: 'notes',
  customFields: 'customFields',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InspectionRecordItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  inspectionRecordId: 'inspectionRecordId',
  templateItemId: 'templateItemId',
  responseValue: 'responseValue',
  scoreObtained: 'scoreObtained',
  comment: 'comment',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InspectionFindingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  inspectionRecordId: 'inspectionRecordId',
  recordItemId: 'recordItemId',
  title: 'title',
  description: 'description',
  severity: 'severity',
  areaLocation: 'areaLocation',
  status: 'status',
  actionTrackingId: 'actionTrackingId',
  escalatedCapaRegisterId: 'escalatedCapaRegisterId',
  identifiedBy: 'identifiedBy',
  identifiedAt: 'identifiedAt',
  targetCloseDate: 'targetCloseDate',
  closedAt: 'closedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InspectionScoreScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  inspectionRecordId: 'inspectionRecordId',
  category: 'category',
  scoreObtained: 'scoreObtained',
  maxPossibleScore: 'maxPossibleScore',
  percentage: 'percentage',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EmergencyMusterPointScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  musterPointCode: 'musterPointCode',
  musterPointName: 'musterPointName',
  locationDescription: 'locationDescription',
  gpsLat: 'gpsLat',
  gpsLong: 'gpsLong',
  capacityEstimate: 'capacityEstimate',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EmergencyResponsePlanScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  planNumber: 'planNumber',
  planTitle: 'planTitle',
  emergencyType: 'emergencyType',
  scenarioDescription: 'scenarioDescription',
  defaultMusterPointId: 'defaultMusterPointId',
  relatedDocumentId: 'relatedDocumentId',
  severityLevel: 'severityLevel',
  reviewFrequency: 'reviewFrequency',
  lastReviewedDate: 'lastReviewedDate',
  nextReviewDueDate: 'nextReviewDueDate',
  reviewedBy: 'reviewedBy',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  effectiveDate: 'effectiveDate',
  version: 'version',
  workflowInstanceId: 'workflowInstanceId',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EmergencyResponsePlanStepScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  emergencyResponsePlanId: 'emergencyResponsePlanId',
  sequenceNo: 'sequenceNo',
  stepDescription: 'stepDescription',
  responsibleErtRole: 'responsibleErtRole',
  maxTimeTargetMinutes: 'maxTimeTargetMinutes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EmergencyResponseTeamScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  teamName: 'teamName',
  teamType: 'teamType',
  effectiveDate: 'effectiveDate',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EmergencyResponseTeamMemberScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  emergencyResponseTeamId: 'emergencyResponseTeamId',
  userId: 'userId',
  ertRole: 'ertRole',
  backupForMemberId: 'backupForMemberId',
  certificationReferenceId: 'certificationReferenceId',
  assignedDate: 'assignedDate',
  endDate: 'endDate',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EmergencyContactScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  contactCategory: 'contactCategory',
  contactName: 'contactName',
  organizationName: 'organizationName',
  phonePrimary: 'phonePrimary',
  phoneSecondary: 'phoneSecondary',
  email: 'email',
  address: 'address',
  distanceFromSiteKm: 'distanceFromSiteKm',
  estimatedResponseTimeMinutes: 'estimatedResponseTimeMinutes',
  is24x7: 'is24x7',
  notes: 'notes',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EmergencyDrillScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  drillNumber: 'drillNumber',
  emergencyResponsePlanId: 'emergencyResponsePlanId',
  drillType: 'drillType',
  scheduledDate: 'scheduledDate',
  actualDate: 'actualDate',
  objective: 'objective',
  scenarioDescription: 'scenarioDescription',
  plannedParticipantCount: 'plannedParticipantCount',
  actualParticipantCount: 'actualParticipantCount',
  evacuationTimeTargetMinutes: 'evacuationTimeTargetMinutes',
  evacuationTimeActualMinutes: 'evacuationTimeActualMinutes',
  observerNotes: 'observerNotes',
  gapsIdentified: 'gapsIdentified',
  capaId: 'capaId',
  conductedBy: 'conductedBy',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.DrillParticipationLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  emergencyDrillId: 'emergencyDrillId',
  userId: 'userId',
  participantName: 'participantName',
  participantType: 'participantType',
  roleDuringDrill: 'roleDuringDrill',
  attendanceStatus: 'attendanceStatus',
  performanceNotes: 'performanceNotes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EmergencyActivationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  emergencyResponsePlanId: 'emergencyResponsePlanId',
  triggerContext: 'triggerContext',
  relatedEmergencyDrillId: 'relatedEmergencyDrillId',
  emergencyType: 'emergencyType',
  activationDatetime: 'activationDatetime',
  activatedBy: 'activatedBy',
  description: 'description',
  totalExpectedHeadcount: 'totalExpectedHeadcount',
  relatedIncidentReportId: 'relatedIncidentReportId',
  allClearDatetime: 'allClearDatetime',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.MusterPointCheckinScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  musterPointId: 'musterPointId',
  emergencyActivationId: 'emergencyActivationId',
  userId: 'userId',
  checkinPersonName: 'checkinPersonName',
  checkinPersonType: 'checkinPersonType',
  checkinTimestamp: 'checkinTimestamp',
  checkinMethod: 'checkinMethod',
  gpsLat: 'gpsLat',
  gpsLong: 'gpsLong',
  deviceInfo: 'deviceInfo',
  recordedBy: 'recordedBy',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EmergencyEquipmentReadinessChecklistScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  checklistNumber: 'checklistNumber',
  assetId: 'assetId',
  inspectionDate: 'inspectionDate',
  checkedBy: 'checkedBy',
  readinessStatus: 'readinessStatus',
  issueDescription: 'issueDescription',
  capaId: 'capaId',
  linkedMaintenanceRecordId: 'linkedMaintenanceRecordId',
  nextCheckDueDate: 'nextCheckDueDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditTypeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  description: 'description',
  requiresExternalBody: 'requiresExternalBody',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditChecklistScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  standardCode: 'standardCode',
  version: 'version',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditChecklistItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  auditChecklistId: 'auditChecklistId',
  clauseReference: 'clauseReference',
  sequenceNo: 'sequenceNo',
  criteriaText: 'criteriaText',
  guidanceNote: 'guidanceNote',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditProgramScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  programYear: 'programYear',
  name: 'name',
  objective: 'objective',
  status: 'status',
  workflowInstanceId: 'workflowInstanceId',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditProgramPlanItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  auditProgramId: 'auditProgramId',
  plannedMonth: 'plannedMonth',
  auditTypeId: 'auditTypeId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  standardReference: 'standardReference',
  plannedLeadAuditorId: 'plannedLeadAuditorId',
  status: 'status',
  linkedAuditId: 'linkedAuditId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  auditNumber: 'auditNumber',
  auditProgramPlanItemId: 'auditProgramPlanItemId',
  auditTypeId: 'auditTypeId',
  auditChecklistId: 'auditChecklistId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  leadAuditorId: 'leadAuditorId',
  plannedStartDate: 'plannedStartDate',
  plannedEndDate: 'plannedEndDate',
  actualStartDate: 'actualStartDate',
  actualEndDate: 'actualEndDate',
  openingMeetingDatetime: 'openingMeetingDatetime',
  openingMeetingNotes: 'openingMeetingNotes',
  closingMeetingDatetime: 'closingMeetingDatetime',
  closingMeetingNotes: 'closingMeetingNotes',
  status: 'status',
  overallConclusion: 'overallConclusion',
  workflowInstanceId: 'workflowInstanceId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditTeamMemberScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  auditId: 'auditId',
  userId: 'userId',
  roleInTeam: 'roleInTeam',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditAuditeeScopeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  auditId: 'auditId',
  departmentId: 'departmentId',
  processArea: 'processArea',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditFindingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  auditId: 'auditId',
  checklistItemId: 'checklistItemId',
  findingNumber: 'findingNumber',
  classification: 'classification',
  clauseReference: 'clauseReference',
  description: 'description',
  evidenceDescription: 'evidenceDescription',
  auditeeResponse: 'auditeeResponse',
  requiresCapa: 'requiresCapa',
  capaRegisterId: 'capaRegisterId',
  status: 'status',
  identifiedBy: 'identifiedBy',
  identifiedAt: 'identifiedAt',
  targetClosureDate: 'targetClosureDate',
  closedAt: 'closedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditorCompetencyRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  competencyType: 'competencyType',
  standardScope: 'standardScope',
  certificationBody: 'certificationBody',
  certificateNumber: 'certificateNumber',
  issuedDate: 'issuedDate',
  expiryDate: 'expiryDate',
  status: 'status',
  relatedTrainingRecordId: 'relatedTrainingRecordId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AuditReportScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  auditId: 'auditId',
  executiveSummary: 'executiveSummary',
  scopeDescription: 'scopeDescription',
  methodologyDescription: 'methodologyDescription',
  conclusion: 'conclusion',
  totalMajorNc: 'totalMajorNc',
  totalMinorNc: 'totalMinorNc',
  totalObservation: 'totalObservation',
  totalOfi: 'totalOfi',
  preparedBy: 'preparedBy',
  preparedAt: 'preparedAt',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  workflowInstanceId: 'workflowInstanceId',
  documentId: 'documentId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CapaRegisterScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  capaNumber: 'capaNumber',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  sourceReferenceNumber: 'sourceReferenceNumber',
  category: 'category',
  priority: 'priority',
  title: 'title',
  problemStatement: 'problemStatement',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  status: 'status',
  initiatedBy: 'initiatedBy',
  initiatedAt: 'initiatedAt',
  targetClosureDate: 'targetClosureDate',
  actualClosureDate: 'actualClosureDate',
  rootCauseSlaReminderSentAt: 'rootCauseSlaReminderSentAt',
  workflowInstanceId: 'workflowInstanceId',
  customFields: 'customFields',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CapaRootCauseAnalysisScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  capaRegisterId: 'capaRegisterId',
  method: 'method',
  methodDetail: 'methodDetail',
  rootCauseSummary: 'rootCauseSummary',
  contributingFactors: 'contributingFactors',
  analyzedBy: 'analyzedBy',
  analyzedAt: 'analyzedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CapaActionPlanScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  capaRegisterId: 'capaRegisterId',
  rootCauseAnalysisId: 'rootCauseAnalysisId',
  actionDescription: 'actionDescription',
  justification: 'justification',
  actionType: 'actionType',
  picUserId: 'picUserId',
  dueDate: 'dueDate',
  actionTrackingId: 'actionTrackingId',
  statusCache: 'statusCache',
  completedDateCache: 'completedDateCache',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CapaEffectivenessVerificationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  capaRegisterId: 'capaRegisterId',
  verificationMethod: 'verificationMethod',
  observationPeriodDays: 'observationPeriodDays',
  verificationDueDate: 'verificationDueDate',
  verifiedBy: 'verifiedBy',
  verifiedAt: 'verifiedAt',
  result: 'result',
  evidenceDescription: 'evidenceDescription',
  notes: 'notes',
  dueReminderSentAt: 'dueReminderSentAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CapaApprovalScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  capaRegisterId: 'capaRegisterId',
  approvalStage: 'approvalStage',
  workflowInstanceId: 'workflowInstanceId',
  decision: 'decision',
  decidedBy: 'decidedBy',
  decidedAt: 'decidedAt',
  comment: 'comment',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.NcrRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  ncrNumber: 'ncrNumber',
  ncrSource: 'ncrSource',
  productCode: 'productCode',
  productName: 'productName',
  batchLotNumber: 'batchLotNumber',
  processArea: 'processArea',
  title: 'title',
  description: 'description',
  detectedDate: 'detectedDate',
  detectedBy: 'detectedBy',
  detectionStage: 'detectionStage',
  severity: 'severity',
  defectCategory: 'defectCategory',
  quantityNonconforming: 'quantityNonconforming',
  unitOfMeasure: 'unitOfMeasure',
  immediateContainmentAction: 'immediateContainmentAction',
  disposition: 'disposition',
  dispositionJustification: 'dispositionJustification',
  dispositionApprovedBy: 'dispositionApprovedBy',
  dispositionApprovedAt: 'dispositionApprovedAt',
  customerComplaintId: 'customerComplaintId',
  supplierCode: 'supplierCode',
  supplierName: 'supplierName',
  reInspectionRequired: 'reInspectionRequired',
  reInspectionResult: 'reInspectionResult',
  capaRegisterId: 'capaRegisterId',
  workflowInstanceId: 'workflowInstanceId',
  status: 'status',
  closedDate: 'closedDate',
  closedBy: 'closedBy',
  customFields: 'customFields',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CustomerComplaintScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  siteId: 'siteId',
  complaintNumber: 'complaintNumber',
  customerName: 'customerName',
  customerCode: 'customerCode',
  customerContactPerson: 'customerContactPerson',
  customerContactEmail: 'customerContactEmail',
  customerContactPhone: 'customerContactPhone',
  productCode: 'productCode',
  productName: 'productName',
  batchLotNumber: 'batchLotNumber',
  quantityAffected: 'quantityAffected',
  complaintChannel: 'complaintChannel',
  complaintDate: 'complaintDate',
  receivedBy: 'receivedBy',
  description: 'description',
  complaintCategory: 'complaintCategory',
  severity: 'severity',
  initialResponseDueDate: 'initialResponseDueDate',
  initialResponseSentAt: 'initialResponseSentAt',
  responseSlaOverdueNotifiedAt: 'responseSlaOverdueNotifiedAt',
  investigationSummary: 'investigationSummary',
  ncrId: 'ncrId',
  capaRegisterId: 'capaRegisterId',
  rootCauseSummary: 'rootCauseSummary',
  correctiveActionSummary: 'correctiveActionSummary',
  customerSatisfactionConfirmed: 'customerSatisfactionConfirmed',
  customerFeedbackDate: 'customerFeedbackDate',
  workflowInstanceId: 'workflowInstanceId',
  status: 'status',
  closedDate: 'closedDate',
  closedBy: 'closedBy',
  customFields: 'customFields',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.QualityInspectionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  inspectionNumber: 'inspectionNumber',
  inspectionType: 'inspectionType',
  productCode: 'productCode',
  productName: 'productName',
  batchLotNumber: 'batchLotNumber',
  supplierCode: 'supplierCode',
  workOrderNumber: 'workOrderNumber',
  quantityInspected: 'quantityInspected',
  quantitySampled: 'quantitySampled',
  samplingMethod: 'samplingMethod',
  inspectorId: 'inspectorId',
  inspectionDate: 'inspectionDate',
  measuringEquipmentAssetId: 'measuringEquipmentAssetId',
  resultStatus: 'resultStatus',
  overallDisposition: 'overallDisposition',
  deviationWorkflowInstanceId: 'deviationWorkflowInstanceId',
  autoGeneratedNcrId: 'autoGeneratedNcrId',
  status: 'status',
  customFields: 'customFields',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.QualityInspectionParameterScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  qualityInspectionId: 'qualityInspectionId',
  parameterName: 'parameterName',
  specificationMin: 'specificationMin',
  specificationMax: 'specificationMax',
  unitOfMeasure: 'unitOfMeasure',
  measuredValue: 'measuredValue',
  result: 'result',
  sequenceNo: 'sequenceNo',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SupplierQualityRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  supplierCode: 'supplierCode',
  supplierName: 'supplierName',
  supplierCategory: 'supplierCategory',
  evaluationType: 'evaluationType',
  evaluationPeriodStart: 'evaluationPeriodStart',
  evaluationPeriodEnd: 'evaluationPeriodEnd',
  qualityScore: 'qualityScore',
  deliveryScore: 'deliveryScore',
  responsivenessScore: 'responsivenessScore',
  overallScore: 'overallScore',
  scoringDetail: 'scoringDetail',
  ncrCountPeriod: 'ncrCountPeriod',
  rating: 'rating',
  correctiveActionRequired: 'correctiveActionRequired',
  capaRegisterId: 'capaRegisterId',
  evaluatedBy: 'evaluatedBy',
  evaluationDate: 'evaluationDate',
  nextEvaluationDueDate: 'nextEvaluationDueDate',
  workflowInstanceId: 'workflowInstanceId',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.QualityObjectiveScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  objectiveCode: 'objectiveCode',
  objectiveTitle: 'objectiveTitle',
  description: 'description',
  isoClauseRef: 'isoClauseRef',
  relatedPolicyDocumentId: 'relatedPolicyDocumentId',
  kpiMetricName: 'kpiMetricName',
  targetValue: 'targetValue',
  targetUnit: 'targetUnit',
  baselineValue: 'baselineValue',
  currentValue: 'currentValue',
  atRiskThresholdPercentage: 'atRiskThresholdPercentage',
  measurementFrequency: 'measurementFrequency',
  ownerUserId: 'ownerUserId',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  status: 'status',
  lastReviewedDate: 'lastReviewedDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.QualityObjectiveProgressLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  qualityObjectiveId: 'qualityObjectiveId',
  periodLabel: 'periodLabel',
  actualValue: 'actualValue',
  recordedBy: 'recordedBy',
  recordedAt: 'recordedAt',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EnvironmentalAspectImpactScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  registerNumber: 'registerNumber',
  lifeCycleStage: 'lifeCycleStage',
  conditionType: 'conditionType',
  activityProcessArea: 'activityProcessArea',
  environmentalAspect: 'environmentalAspect',
  environmentalImpact: 'environmentalImpact',
  impactType: 'impactType',
  likelihoodScore: 'likelihoodScore',
  severityScore: 'severityScore',
  frequencyScore: 'frequencyScore',
  regulatoryScore: 'regulatoryScore',
  stakeholderConcernScore: 'stakeholderConcernScore',
  scoringWeightDetail: 'scoringWeightDetail',
  significanceScore: 'significanceScore',
  significanceThreshold: 'significanceThreshold',
  significanceLevel: 'significanceLevel',
  existingControls: 'existingControls',
  isRegulated: 'isRegulated',
  relatedPermitId: 'relatedPermitId',
  capaRegisterId: 'capaRegisterId',
  workflowInstanceId: 'workflowInstanceId',
  reviewDate: 'reviewDate',
  nextReviewDate: 'nextReviewDate',
  reviewedBy: 'reviewedBy',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EnvironmentalMonitoringRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  monitoringNumber: 'monitoringNumber',
  monitoringType: 'monitoringType',
  monitoringPointCode: 'monitoringPointCode',
  monitoringPointName: 'monitoringPointName',
  parameterName: 'parameterName',
  unitOfMeasure: 'unitOfMeasure',
  resultValue: 'resultValue',
  bakuMutuMin: 'bakuMutuMin',
  bakuMutuMax: 'bakuMutuMax',
  regulatoryReference: 'regulatoryReference',
  complianceStatus: 'complianceStatus',
  samplingDate: 'samplingDate',
  samplingTime: 'samplingTime',
  analysisMethod: 'analysisMethod',
  labName: 'labName',
  labAccreditationNo: 'labAccreditationNo',
  sampleTakenBy: 'sampleTakenBy',
  analyzedBy: 'analyzedBy',
  reportNumber: 'reportNumber',
  weatherCondition: 'weatherCondition',
  relatedPermitId: 'relatedPermitId',
  capaRegisterId: 'capaRegisterId',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WasteManifestRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  manifestNumber: 'manifestNumber',
  festronikManifestNo: 'festronikManifestNo',
  wasteType: 'wasteType',
  wasteCode: 'wasteCode',
  wasteName: 'wasteName',
  wasteDescription: 'wasteDescription',
  wasteSourceProcess: 'wasteSourceProcess',
  quantity: 'quantity',
  unitOfMeasure: 'unitOfMeasure',
  packagingType: 'packagingType',
  generationDate: 'generationDate',
  storageLocation: 'storageLocation',
  tpsLb3PermitId: 'tpsLb3PermitId',
  transporterName: 'transporterName',
  transporterLicenseNo: 'transporterLicenseNo',
  transporterVehicleNo: 'transporterVehicleNo',
  transportDate: 'transportDate',
  destinationFacilityName: 'destinationFacilityName',
  destinationFacilityLicenseNo: 'destinationFacilityLicenseNo',
  receivingConfirmationDate: 'receivingConfirmationDate',
  manifestStatus: 'manifestStatus',
  festronikSyncStatus: 'festronikSyncStatus',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WasteGenerationLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  logDate: 'logDate',
  wasteCode: 'wasteCode',
  wasteName: 'wasteName',
  wasteType: 'wasteType',
  quantityGenerated: 'quantityGenerated',
  unitOfMeasure: 'unitOfMeasure',
  storageLocation: 'storageLocation',
  storageStartDate: 'storageStartDate',
  maxStorageDurationDays: 'maxStorageDurationDays',
  cumulativeStoredQuantity: 'cumulativeStoredQuantity',
  storageDurationWarningSentAt: 'storageDurationWarningSentAt',
  linkedWasteManifestId: 'linkedWasteManifestId',
  recordedBy: 'recordedBy',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ProperSelfAssessmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  companyId: 'companyId',
  siteId: 'siteId',
  assessmentPeriod: 'assessmentPeriod',
  assessmentType: 'assessmentType',
  overallPredictedRating: 'overallPredictedRating',
  overrideJustification: 'overrideJustification',
  complianceScorePercentage: 'complianceScorePercentage',
  assessedBy: 'assessedBy',
  assessmentDate: 'assessmentDate',
  reviewedBy: 'reviewedBy',
  reviewDate: 'reviewDate',
  workflowInstanceId: 'workflowInstanceId',
  submissionStatus: 'submissionStatus',
  klhkOfficialRating: 'klhkOfficialRating',
  klhkRatingReceivedDate: 'klhkRatingReceivedDate',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ProperSelfAssessmentCriteriaScoreScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  properSelfAssessmentId: 'properSelfAssessmentId',
  criteriaCategory: 'criteriaCategory',
  criteriaDescription: 'criteriaDescription',
  complianceStatus: 'complianceStatus',
  evidenceReferenceType: 'evidenceReferenceType',
  evidenceReferenceId: 'evidenceReferenceId',
  scoreValue: 'scoreValue',
  weightPercentage: 'weightPercentage',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.EnvironmentalPermitScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  licensePermitId: 'licensePermitId',
  permitMedia: 'permitMedia',
  requiredMonitoringParameters: 'requiredMonitoringParameters',
  requiredMonitoringFrequency: 'requiredMonitoringFrequency',
  reportingObligationTo: 'reportingObligationTo',
  lastReportSubmittedDate: 'lastReportSubmittedDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.MedicalRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employeeUserId: 'employeeUserId',
  companyId: 'companyId',
  siteId: 'siteId',
  bloodTypeEncrypted: 'bloodTypeEncrypted',
  knownAllergiesEncrypted: 'knownAllergiesEncrypted',
  chronicConditionsEncrypted: 'chronicConditionsEncrypted',
  currentMedicationsEncrypted: 'currentMedicationsEncrypted',
  disabilityStatusEncrypted: 'disabilityStatusEncrypted',
  immunizationHistoryEncrypted: 'immunizationHistoryEncrypted',
  baselineHealthNotesEncrypted: 'baselineHealthNotesEncrypted',
  emergencyMedicalContactName: 'emergencyMedicalContactName',
  emergencyMedicalContactPhone: 'emergencyMedicalContactPhone',
  emergencyMedicalContactRelationship: 'emergencyMedicalContactRelationship',
  consentId: 'consentId',
  lastUpdatedByPractitioner: 'lastUpdatedByPractitioner',
  recordStatus: 'recordStatus',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.McuScheduleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  employeeUserId: 'employeeUserId',
  mcuType: 'mcuType',
  scheduledDate: 'scheduledDate',
  mcuPackageCode: 'mcuPackageCode',
  mcuPackageName: 'mcuPackageName',
  reasonForSpecialEncrypted: 'reasonForSpecialEncrypted',
  providerClinicName: 'providerClinicName',
  linkedHealthSurveillanceProgramId: 'linkedHealthSurveillanceProgramId',
  status: 'status',
  reminderSentAt: 'reminderSentAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.McuResultScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  mcuScheduleId: 'mcuScheduleId',
  employeeUserId: 'employeeUserId',
  examinationDate: 'examinationDate',
  examiningPhysicianName: 'examiningPhysicianName',
  examiningPhysicianLicenseNo: 'examiningPhysicianLicenseNo',
  heightCmEncrypted: 'heightCmEncrypted',
  weightKgEncrypted: 'weightKgEncrypted',
  bmiEncrypted: 'bmiEncrypted',
  bloodPressureSystolicEncrypted: 'bloodPressureSystolicEncrypted',
  bloodPressureDiastolicEncrypted: 'bloodPressureDiastolicEncrypted',
  pulseRateEncrypted: 'pulseRateEncrypted',
  labResultsEncrypted: 'labResultsEncrypted',
  radiologyResultsEncrypted: 'radiologyResultsEncrypted',
  audiometryResultsEncrypted: 'audiometryResultsEncrypted',
  spirometryResultsEncrypted: 'spirometryResultsEncrypted',
  physicianConclusionEncrypted: 'physicianConclusionEncrypted',
  diagnosisCodesEncrypted: 'diagnosisCodesEncrypted',
  overallMcuResult: 'overallMcuResult',
  fitToWorkAssessmentId: 'fitToWorkAssessmentId',
  reportFileAttachmentNote: 'reportFileAttachmentNote',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.FitToWorkAssessmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  employeeUserId: 'employeeUserId',
  assessmentDate: 'assessmentDate',
  assessmentTrigger: 'assessmentTrigger',
  relatedMcuResultId: 'relatedMcuResultId',
  assessedBy: 'assessedBy',
  fitStatus: 'fitStatus',
  restrictionDetailsEncrypted: 'restrictionDetailsEncrypted',
  restrictionSummaryForSupervisor: 'restrictionSummaryForSupervisor',
  restrictionValidFrom: 'restrictionValidFrom',
  restrictionValidUntil: 'restrictionValidUntil',
  linkedRestrictedDutyAssignmentId: 'linkedRestrictedDutyAssignmentId',
  nextReassessmentDate: 'nextReassessmentDate',
  reassessmentReminderSentAt: 'reassessmentReminderSentAt',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.OccupationalDiseaseCaseScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  caseNumber: 'caseNumber',
  employeeUserId: 'employeeUserId',
  diagnosisDate: 'diagnosisDate',
  diagnosedBy: 'diagnosedBy',
  diseaseCategory: 'diseaseCategory',
  diagnosisDetailEncrypted: 'diagnosisDetailEncrypted',
  suspectedCausalAgentExposureEncrypted: 'suspectedCausalAgentExposureEncrypted',
  relatedHiraId: 'relatedHiraId',
  relatedEnvironmentalMonitoringRecordId: 'relatedEnvironmentalMonitoringRecordId',
  severityClassification: 'severityClassification',
  workRelatednessDetermination: 'workRelatednessDetermination',
  reportedToDisnaker: 'reportedToDisnaker',
  disnakerReportDate: 'disnakerReportDate',
  disnakerReportNumber: 'disnakerReportNumber',
  bpjsKetenagakerjaanClaimNumber: 'bpjsKetenagakerjaanClaimNumber',
  capaRegisterId: 'capaRegisterId',
  workflowInstanceId: 'workflowInstanceId',
  caseStatus: 'caseStatus',
  closedDate: 'closedDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ClinicVisitLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  visitNumber: 'visitNumber',
  employeeUserId: 'employeeUserId',
  visitorName: 'visitorName',
  visitorType: 'visitorType',
  visitDatetime: 'visitDatetime',
  visitType: 'visitType',
  chiefComplaintEncrypted: 'chiefComplaintEncrypted',
  vitalSignsEncrypted: 'vitalSignsEncrypted',
  treatmentGivenEncrypted: 'treatmentGivenEncrypted',
  medicationDispensedEncrypted: 'medicationDispensedEncrypted',
  referralRequired: 'referralRequired',
  referralFacilityName: 'referralFacilityName',
  referralReasonEncrypted: 'referralReasonEncrypted',
  workStatusAfterVisit: 'workStatusAfterVisit',
  linkedIncidentId: 'linkedIncidentId',
  attendedBy: 'attendedBy',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.HealthSurveillanceProgramScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  programName: 'programName',
  exposureType: 'exposureType',
  relatedHiraId: 'relatedHiraId',
  targetPopulationCriteria: 'targetPopulationCriteria',
  monitoringFrequency: 'monitoringFrequency',
  mcuPackageRequired: 'mcuPackageRequired',
  programOwner: 'programOwner',
  startDate: 'startDate',
  reviewDate: 'reviewDate',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.HealthSurveillanceEnrollmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  healthSurveillanceProgramId: 'healthSurveillanceProgramId',
  employeeUserId: 'employeeUserId',
  enrollmentDate: 'enrollmentDate',
  exitDate: 'exitDate',
  exitReason: 'exitReason',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.RestrictedDutyAssignmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  employeeUserId: 'employeeUserId',
  fitToWorkAssessmentId: 'fitToWorkAssessmentId',
  restrictionType: 'restrictionType',
  alternativeTaskDescription: 'alternativeTaskDescription',
  assignedBy: 'assignedBy',
  startDate: 'startDate',
  endDate: 'endDate',
  complianceConfirmedBySupervisor: 'complianceConfirmedBySupervisor',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.OccupationalHealthAuthorizedUserScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  authorizedScopeType: 'authorizedScopeType',
  authorizedScopeId: 'authorizedScopeId',
  medicalPractitionerLicenseNo: 'medicalPractitionerLicenseNo',
  authorizationReason: 'authorizationReason',
  authorizedBy: 'authorizedBy',
  authorizedAt: 'authorizedAt',
  expiryDate: 'expiryDate',
  revokedAt: 'revokedAt',
  revokedBy: 'revokedBy',
  revokeReason: 'revokeReason',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.MedicalRecordAccessLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accessedByUserId: 'accessedByUserId',
  subjectEmployeeUserId: 'subjectEmployeeUserId',
  accessedEntityType: 'accessedEntityType',
  accessedEntityId: 'accessedEntityId',
  accessType: 'accessType',
  reasonForAccess: 'reasonForAccess',
  reasonNotes: 'reasonNotes',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  accessedAt: 'accessedAt'
};

exports.Prisma.HealthDataConsentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employeeUserId: 'employeeUserId',
  consentPurpose: 'consentPurpose',
  consentStatus: 'consentStatus',
  consentGivenAt: 'consentGivenAt',
  consentChannel: 'consentChannel',
  withdrawalDate: 'withdrawalDate',
  withdrawalReason: 'withdrawalReason',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.HealthDataSubjectRequestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employeeUserId: 'employeeUserId',
  requestType: 'requestType',
  requestDate: 'requestDate',
  requestDetail: 'requestDetail',
  handledBy: 'handledBy',
  resolutionNotes: 'resolutionNotes',
  resolutionDate: 'resolutionDate',
  status: 'status',
  rejectionReason: 'rejectionReason',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.TenantEncryptionKeyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  wrappedDataKey: 'wrappedDataKey',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetCategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  categoryName: 'categoryName',
  parentCategoryId: 'parentCategoryId',
  defaultIsSafetyCritical: 'defaultIsSafetyCritical',
  requiresDisposalApproval: 'requiresDisposalApproval',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  assetCategoryId: 'assetCategoryId',
  assetCode: 'assetCode',
  assetName: 'assetName',
  manufacturer: 'manufacturer',
  modelNumber: 'modelNumber',
  serialNumber: 'serialNumber',
  purchaseDate: 'purchaseDate',
  isSafetyCritical: 'isSafetyCritical',
  lifecycleStatus: 'lifecycleStatus',
  conditionStatus: 'conditionStatus',
  customFields: 'customFields',
  disposalWorkflowInstanceId: 'disposalWorkflowInstanceId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.MaintenanceScheduleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetId: 'assetId',
  maintenanceType: 'maintenanceType',
  intervalType: 'intervalType',
  intervalValue: 'intervalValue',
  nextDueDate: 'nextDueDate',
  responsibleRoleId: 'responsibleRoleId',
  isActive: 'isActive',
  dueSoonReminderSentAt: 'dueSoonReminderSentAt',
  overdueNotifiedAt: 'overdueNotifiedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.MaintenanceRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetId: 'assetId',
  maintenanceScheduleId: 'maintenanceScheduleId',
  performedDate: 'performedDate',
  performedBy: 'performedBy',
  findings: 'findings',
  resultCondition: 'resultCondition',
  cost: 'cost',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.AssetTransferLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetId: 'assetId',
  fromSiteId: 'fromSiteId',
  toSiteId: 'toSiteId',
  transferDate: 'transferDate',
  requestedBy: 'requestedBy',
  approvedBy: 'approvedBy',
  reason: 'reason',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.CalibrationItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetId: 'assetId',
  siteId: 'siteId',
  departmentId: 'departmentId',
  equipmentTagNo: 'equipmentTagNo',
  measurementParameter: 'measurementParameter',
  measurementRangeMin: 'measurementRangeMin',
  measurementRangeMax: 'measurementRangeMax',
  measurementRangeUnit: 'measurementRangeUnit',
  accuracyClass: 'accuracyClass',
  resolution: 'resolution',
  calibrationIntervalMonths: 'calibrationIntervalMonths',
  calibrationMethodStandard: 'calibrationMethodStandard',
  isCriticalMeasurement: 'isCriticalMeasurement',
  calibrationStatus: 'calibrationStatus',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CalibrationProviderScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  providerName: 'providerName',
  providerType: 'providerType',
  accreditationBody: 'accreditationBody',
  accreditationNumber: 'accreditationNumber',
  accreditationScope: 'accreditationScope',
  accreditationValidUntil: 'accreditationValidUntil',
  accreditationExpiryWarningSentAt: 'accreditationExpiryWarningSentAt',
  address: 'address',
  contactPersonName: 'contactPersonName',
  contactPersonPhone: 'contactPersonPhone',
  contactPersonEmail: 'contactPersonEmail',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CalibrationScheduleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  calibrationItemId: 'calibrationItemId',
  calibrationWoNo: 'calibrationWoNo',
  scheduledDate: 'scheduledDate',
  dueDate: 'dueDate',
  reminderSentAtDay30: 'reminderSentAtDay30',
  reminderSentAtDay14: 'reminderSentAtDay14',
  reminderSentAtDay7: 'reminderSentAtDay7',
  reminderSentAtDay1: 'reminderSentAtDay1',
  overdueNotifiedAt: 'overdueNotifiedAt',
  assignedProviderId: 'assignedProviderId',
  status: 'status',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CalibrationCertificateScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  calibrationScheduleId: 'calibrationScheduleId',
  calibrationItemId: 'calibrationItemId',
  internalReferenceNo: 'internalReferenceNo',
  certificateNo: 'certificateNo',
  calibrationProviderId: 'calibrationProviderId',
  calibrationDate: 'calibrationDate',
  nextDueDate: 'nextDueDate',
  calibrationResult: 'calibrationResult',
  asFoundCondition: 'asFoundCondition',
  asLeftCondition: 'asLeftCondition',
  measurementUncertainty: 'measurementUncertainty',
  referenceStandardUsed: 'referenceStandardUsed',
  environmentalConditions: 'environmentalConditions',
  isReviewed: 'isReviewed',
  reviewedBy: 'reviewedBy',
  reviewedAt: 'reviewedAt',
  status: 'status',
  workflowInstanceId: 'workflowInstanceId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.OutOfToleranceRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  calibrationCertificateId: 'calibrationCertificateId',
  calibrationItemId: 'calibrationItemId',
  deviationDescription: 'deviationDescription',
  deviationMagnitude: 'deviationMagnitude',
  potentialImpactAssessment: 'potentialImpactAssessment',
  affectedPeriodFrom: 'affectedPeriodFrom',
  affectedPeriodTo: 'affectedPeriodTo',
  impactLevel: 'impactLevel',
  requiresCapa: 'requiresCapa',
  capaRegisterId: 'capaRegisterId',
  requiresIncidentReport: 'requiresIncidentReport',
  incidentReportId: 'incidentReportId',
  status: 'status',
  closedBy: 'closedBy',
  closedAt: 'closedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ContractorScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contractorName: 'contractorName',
  contractorType: 'contractorType',
  businessRegistrationNo: 'businessRegistrationNo',
  businessLicenseType: 'businessLicenseType',
  taxIdNpwp: 'taxIdNpwp',
  address: 'address',
  city: 'city',
  province: 'province',
  contactPersonName: 'contactPersonName',
  contactPersonPhone: 'contactPersonPhone',
  contactPersonEmail: 'contactPersonEmail',
  contractorCategory: 'contractorCategory',
  parentContractorId: 'parentContractorId',
  overallRiskRating: 'overallRiskRating',
  status: 'status',
  registeredAt: 'registeredAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ContractorPrequalificationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contractorId: 'contractorId',
  prequalificationNo: 'prequalificationNo',
  prequalificationType: 'prequalificationType',
  scopeOfWork: 'scopeOfWork',
  technicalCapabilityScore: 'technicalCapabilityScore',
  hseCapabilityScore: 'hseCapabilityScore',
  financialCapabilityScore: 'financialCapabilityScore',
  overallScore: 'overallScore',
  minPassingScore: 'minPassingScore',
  result: 'result',
  validFrom: 'validFrom',
  validUntil: 'validUntil',
  evaluatedBy: 'evaluatedBy',
  evaluationDate: 'evaluationDate',
  workflowInstanceId: 'workflowInstanceId',
  status: 'status',
  renewalReminderSentAt: 'renewalReminderSentAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ContractorPrequalificationDocumentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  prequalificationId: 'prequalificationId',
  documentType: 'documentType',
  documentId: 'documentId',
  isMandatory: 'isMandatory',
  status: 'status',
  verifiedBy: 'verifiedBy',
  verifiedAt: 'verifiedAt',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ContractorDocumentComplianceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contractorId: 'contractorId',
  documentCategory: 'documentCategory',
  documentId: 'documentId',
  documentNumber: 'documentNumber',
  issuedBy: 'issuedBy',
  issueDate: 'issueDate',
  expiryDate: 'expiryDate',
  reminderDaysBefore: 'reminderDaysBefore',
  status: 'status',
  isMandatoryForPtk007: 'isMandatoryForPtk007',
  reminderSentAt: 'reminderSentAt',
  expiredNotifiedAt: 'expiredNotifiedAt',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ContractorWorkerScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contractorId: 'contractorId',
  projectAssignmentId: 'projectAssignmentId',
  fullName: 'fullName',
  idNumberKtp: 'idNumberKtp',
  dateOfBirth: 'dateOfBirth',
  jobPosition: 'jobPosition',
  workerCategory: 'workerCategory',
  isAuthorizedPermitRequester: 'isAuthorizedPermitRequester',
  siteInductionCompleted: 'siteInductionCompleted',
  siteInductionDate: 'siteInductionDate',
  status: 'status',
  mobilizationDate: 'mobilizationDate',
  demobilizationDate: 'demobilizationDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ContractorProjectAssignmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contractorId: 'contractorId',
  companyId: 'companyId',
  branchId: 'branchId',
  siteId: 'siteId',
  contractNo: 'contractNo',
  contractTitle: 'contractTitle',
  scopeOfWork: 'scopeOfWork',
  contractStartDate: 'contractStartDate',
  contractEndDate: 'contractEndDate',
  contractValue: 'contractValue',
  hsePlanDocumentId: 'hsePlanDocumentId',
  picInternalUserId: 'picInternalUserId',
  contractorPicWorkerId: 'contractorPicWorkerId',
  riskClassification: 'riskClassification',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ContractorPerformanceEvaluationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contractorId: 'contractorId',
  projectAssignmentId: 'projectAssignmentId',
  evaluationPeriod: 'evaluationPeriod',
  periodStartDate: 'periodStartDate',
  periodEndDate: 'periodEndDate',
  hseComplianceScore: 'hseComplianceScore',
  incidentCount: 'incidentCount',
  nearMissCount: 'nearMissCount',
  manHoursWorked: 'manHoursWorked',
  trirLtiMetrics: 'trirLtiMetrics',
  documentComplianceScore: 'documentComplianceScore',
  overallRating: 'overallRating',
  evaluatedBy: 'evaluatedBy',
  evaluationDate: 'evaluationDate',
  recommendation: 'recommendation',
  workflowInstanceId: 'workflowInstanceId',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedBy: 'updatedBy',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserType = exports.$Enums.UserType = {
  INTERNAL_EMPLOYEE: 'INTERNAL_EMPLOYEE',
  CONTRACTOR: 'CONTRACTOR',
  VISITOR: 'VISITOR',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN'
};

exports.UserStatus = exports.$Enums.UserStatus = {
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED'
};

exports.Language = exports.$Enums.Language = {
  ID: 'ID',
  EN: 'EN'
};

exports.DeviceType = exports.$Enums.DeviceType = {
  WEB: 'WEB',
  MOBILE_WEB: 'MOBILE_WEB',
  API: 'API'
};

exports.RoleStatus = exports.$Enums.RoleStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.ScopeType = exports.$Enums.ScopeType = {
  TENANT: 'TENANT',
  COMPANY: 'COMPANY',
  BRANCH: 'BRANCH',
  SITE: 'SITE',
  DEPARTMENT: 'DEPARTMENT'
};

exports.UserRoleStatus = exports.$Enums.UserRoleStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.SsoIdpProvider = exports.$Enums.SsoIdpProvider = {
  AZURE_AD: 'AZURE_AD',
  GOOGLE_WORKSPACE: 'GOOGLE_WORKSPACE',
  SAML_GENERIC: 'SAML_GENERIC',
  OIDC_GENERIC: 'OIDC_GENERIC'
};

exports.SsoMappingStatus = exports.$Enums.SsoMappingStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.DelegationReason = exports.$Enums.DelegationReason = {
  ANNUAL_LEAVE: 'ANNUAL_LEAVE',
  SICK_LEAVE: 'SICK_LEAVE',
  BUSINESS_TRIP: 'BUSINESS_TRIP',
  RESIGNATION_TRANSITION: 'RESIGNATION_TRANSITION',
  OTHER: 'OTHER'
};

exports.DelegationStatus = exports.$Enums.DelegationStatus = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  REVOKED: 'REVOKED'
};

exports.WorkflowApproverType = exports.$Enums.WorkflowApproverType = {
  SPECIFIC_USER: 'SPECIFIC_USER',
  ROLE_IN_SCOPE: 'ROLE_IN_SCOPE',
  REPORTING_LINE: 'REPORTING_LINE',
  CONTEXT_USER: 'CONTEXT_USER'
};

exports.WorkflowEscalationAction = exports.$Enums.WorkflowEscalationAction = {
  NOTIFY_SUPERIOR: 'NOTIFY_SUPERIOR',
  AUTO_ESCALATE: 'AUTO_ESCALATE',
  NONE: 'NONE'
};

exports.WorkflowParallelCompletionRule = exports.$Enums.WorkflowParallelCompletionRule = {
  ALL_APPROVE: 'ALL_APPROVE',
  ANY_ONE_APPROVE: 'ANY_ONE_APPROVE'
};

exports.WorkflowTaskAction = exports.$Enums.WorkflowTaskAction = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  RETURN: 'RETURN'
};

exports.WorkflowInstanceStatus = exports.$Enums.WorkflowInstanceStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

exports.WorkflowTaskStatus = exports.$Enums.WorkflowTaskStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  DELEGATED: 'DELEGATED'
};

exports.NumberingResetPeriod = exports.$Enums.NumberingResetPeriod = {
  YEARLY: 'YEARLY',
  MONTHLY: 'MONTHLY',
  NEVER: 'NEVER'
};

exports.NumberingScopeLevel = exports.$Enums.NumberingScopeLevel = {
  TENANT: 'TENANT',
  COMPANY: 'COMPANY',
  SITE: 'SITE'
};

exports.NotificationPriority = exports.$Enums.NotificationPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.NotificationChannelCode = exports.$Enums.NotificationChannelCode = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
  TELEGRAM: 'TELEGRAM'
};

exports.NotificationLanguage = exports.$Enums.NotificationLanguage = {
  ID: 'ID',
  EN: 'EN'
};

exports.NotificationDeliveryMode = exports.$Enums.NotificationDeliveryMode = {
  REAL_TIME: 'REAL_TIME',
  DIGEST_DAILY: 'DIGEST_DAILY',
  DIGEST_WEEKLY: 'DIGEST_WEEKLY'
};

exports.NotificationLogStatus = exports.$Enums.NotificationLogStatus = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED'
};

exports.AttachmentScanStatus = exports.$Enums.AttachmentScanStatus = {
  PENDING_SCAN: 'PENDING_SCAN',
  CLEAN: 'CLEAN',
  INFECTED: 'INFECTED'
};

exports.TenantDeploymentMode = exports.$Enums.TenantDeploymentMode = {
  SHARED_CLOUD: 'SHARED_CLOUD',
  DEDICATED_CLOUD: 'DEDICATED_CLOUD',
  ON_PREMISE: 'ON_PREMISE'
};

exports.TenantStatus = exports.$Enums.TenantStatus = {
  TRIAL: 'TRIAL',
  PROVISIONING: 'PROVISIONING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED'
};

exports.OrgEntityStatus = exports.$Enums.OrgEntityStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.BranchType = exports.$Enums.BranchType = {
  HEAD_OFFICE: 'HEAD_OFFICE',
  REGIONAL_OFFICE: 'REGIONAL_OFFICE',
  PLANT_OFFICE: 'PLANT_OFFICE',
  OTHER: 'OTHER'
};

exports.SiteType = exports.$Enums.SiteType = {
  PERMANENT: 'PERMANENT',
  PROJECT: 'PROJECT'
};

exports.SiteCategory = exports.$Enums.SiteCategory = {
  PLANT_FACTORY: 'PLANT_FACTORY',
  RIG: 'RIG',
  WELL_PAD: 'WELL_PAD',
  WAREHOUSE: 'WAREHOUSE',
  OFFICE: 'OFFICE',
  CONSTRUCTION_SITE: 'CONSTRUCTION_SITE',
  MINE_SITE: 'MINE_SITE',
  OTHER: 'OTHER'
};

exports.SiteRiskProfile = exports.$Enums.SiteRiskProfile = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.SiteStatus = exports.$Enums.SiteStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.DepartmentType = exports.$Enums.DepartmentType = {
  OPERATIONAL: 'OPERATIONAL',
  SUPPORT: 'SUPPORT',
  HSE: 'HSE',
  QUALITY: 'QUALITY',
  MAINTENANCE: 'MAINTENANCE',
  ADMIN: 'ADMIN',
  OTHER: 'OTHER'
};

exports.BillingPeriod = exports.$Enums.BillingPeriod = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY'
};

exports.TenantSubscriptionStatus = exports.$Enums.TenantSubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED'
};

exports.UsageMetricType = exports.$Enums.UsageMetricType = {
  ACTIVE_USERS: 'ACTIVE_USERS',
  ACTIVE_SITES: 'ACTIVE_SITES'
};

exports.DataImportJobStatus = exports.$Enums.DataImportJobStatus = {
  UPLOADED: 'UPLOADED',
  VALIDATING: 'VALIDATING',
  VALIDATED: 'VALIDATED',
  IMPORTING: 'IMPORTING',
  COMPLETED: 'COMPLETED',
  COMPLETED_WITH_ERRORS: 'COMPLETED_WITH_ERRORS',
  FAILED: 'FAILED'
};

exports.DocumentCategoryStatus = exports.$Enums.DocumentCategoryStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.DocumentType = exports.$Enums.DocumentType = {
  POLICY: 'POLICY',
  MANUAL: 'MANUAL',
  SOP: 'SOP',
  WORK_INSTRUCTION: 'WORK_INSTRUCTION',
  FORM: 'FORM',
  GUIDELINE: 'GUIDELINE',
  RECORD: 'RECORD',
  EXTERNAL_STANDARD: 'EXTERNAL_STANDARD',
  OTHER: 'OTHER'
};

exports.DocumentClassification = exports.$Enums.DocumentClassification = {
  PUBLIC: 'PUBLIC',
  INTERNAL: 'INTERNAL',
  CONFIDENTIAL: 'CONFIDENTIAL',
  RESTRICTED: 'RESTRICTED'
};

exports.DocumentStatus = exports.$Enums.DocumentStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  UNDER_REVISION: 'UNDER_REVISION',
  OBSOLETE: 'OBSOLETE',
  RETIRED: 'RETIRED'
};

exports.DocumentVersionStatus = exports.$Enums.DocumentVersionStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  SUPERSEDED: 'SUPERSEDED',
  REJECTED: 'REJECTED'
};

exports.DistributionTargetType = exports.$Enums.DistributionTargetType = {
  USER: 'USER',
  ROLE: 'ROLE',
  DEPARTMENT: 'DEPARTMENT',
  SITE: 'SITE',
  COMPANY: 'COMPANY',
  ALL_TENANT: 'ALL_TENANT'
};

exports.ReadAcknowledgementStatus = exports.$Enums.ReadAcknowledgementStatus = {
  PENDING: 'PENDING',
  VIEWED: 'VIEWED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  OVERDUE: 'OVERDUE'
};

exports.AcknowledgementMethod = exports.$Enums.AcknowledgementMethod = {
  IN_APP_CLICK: 'IN_APP_CLICK',
  E_SIGNATURE: 'E_SIGNATURE'
};

exports.ReviewOutcome = exports.$Enums.ReviewOutcome = {
  NO_CHANGE_NEEDED: 'NO_CHANGE_NEEDED',
  MINOR_REVISION: 'MINOR_REVISION',
  MAJOR_REVISION_TRIGGERED: 'MAJOR_REVISION_TRIGGERED',
  RETIRE_DOCUMENT: 'RETIRE_DOCUMENT'
};

exports.ReviewScheduleStatus = exports.$Enums.ReviewScheduleStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED'
};

exports.RegulatoryFrameworkCategory = exports.$Enums.RegulatoryFrameworkCategory = {
  ISO_STANDARD: 'ISO_STANDARD',
  GOVERNMENT_REGULATION: 'GOVERNMENT_REGULATION',
  INDUSTRY_GUIDELINE: 'INDUSTRY_GUIDELINE'
};

exports.RegulationType = exports.$Enums.RegulationType = {
  LAW_UU: 'LAW_UU',
  GOVERNMENT_REGULATION_PP: 'GOVERNMENT_REGULATION_PP',
  MINISTERIAL_REGULATION_PERMEN: 'MINISTERIAL_REGULATION_PERMEN',
  MINISTERIAL_DECREE_KEPMEN: 'MINISTERIAL_DECREE_KEPMEN',
  LOCAL_REGULATION_PERDA: 'LOCAL_REGULATION_PERDA',
  INTERNATIONAL_STANDARD: 'INTERNATIONAL_STANDARD',
  COMPANY_INTERNAL_STANDARD: 'COMPANY_INTERNAL_STANDARD',
  GUIDELINE: 'GUIDELINE'
};

exports.ComplianceApplicableScope = exports.$Enums.ComplianceApplicableScope = {
  ALL_TENANT: 'ALL_TENANT',
  SPECIFIC_COMPANY: 'SPECIFIC_COMPANY',
  SPECIFIC_SITE: 'SPECIFIC_SITE'
};

exports.RegulatoryRegisterStatus = exports.$Enums.RegulatoryRegisterStatus = {
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  REVOKED: 'REVOKED'
};

exports.ObligationType = exports.$Enums.ObligationType = {
  REPORTING: 'REPORTING',
  LICENSING: 'LICENSING',
  TRAINING: 'TRAINING',
  INSPECTION: 'INSPECTION',
  DOCUMENTATION: 'DOCUMENTATION',
  ORGANIZATIONAL: 'ORGANIZATIONAL',
  TECHNICAL_CONTROL: 'TECHNICAL_CONTROL',
  OTHER: 'OTHER'
};

exports.ObligationFrequency = exports.$Enums.ObligationFrequency = {
  ONE_TIME: 'ONE_TIME',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  SEMI_ANNUAL: 'SEMI_ANNUAL',
  ANNUAL: 'ANNUAL',
  AS_NEEDED: 'AS_NEEDED'
};

exports.ObligationStatus = exports.$Enums.ObligationStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  RETIRED: 'RETIRED'
};

exports.EvaluationMethod = exports.$Enums.EvaluationMethod = {
  DOCUMENT_REVIEW: 'DOCUMENT_REVIEW',
  SITE_VERIFICATION: 'SITE_VERIFICATION',
  INTERVIEW: 'INTERVIEW',
  COMBINED: 'COMBINED'
};

exports.ComplianceStatus = exports.$Enums.ComplianceStatus = {
  COMPLIANT: 'COMPLIANT',
  NON_COMPLIANT: 'NON_COMPLIANT',
  PARTIALLY_COMPLIANT: 'PARTIALLY_COMPLIANT',
  NOT_APPLICABLE: 'NOT_APPLICABLE'
};

exports.ComplianceEvaluationStatus = exports.$Enums.ComplianceEvaluationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  REVIEWED: 'REVIEWED',
  CLOSED: 'CLOSED'
};

exports.LicenseType = exports.$Enums.LicenseType = {
  ENVIRONMENTAL_PERMIT: 'ENVIRONMENTAL_PERMIT',
  OPERATIONAL_PERMIT: 'OPERATIONAL_PERMIT',
  SIO_OPERATOR_CERT: 'SIO_OPERATOR_CERT',
  BUILDING_PERMIT_PBG: 'BUILDING_PERMIT_PBG',
  HAZWASTE_PERMIT_TPS_LB3: 'HAZWASTE_PERMIT_TPS_LB3',
  PROPER_RATING: 'PROPER_RATING',
  OTHER: 'OTHER'
};

exports.LicenseHolderType = exports.$Enums.LicenseHolderType = {
  COMPANY: 'COMPANY',
  SITE: 'SITE',
  EQUIPMENT: 'EQUIPMENT',
  INDIVIDUAL: 'INDIVIDUAL'
};

exports.LicenseStatus = exports.$Enums.LicenseStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  IN_RENEWAL_PROCESS: 'IN_RENEWAL_PROCESS'
};

exports.RiskMatrixModuleScope = exports.$Enums.RiskMatrixModuleScope = {
  HIRA: 'HIRA',
  JSA: 'JSA',
  HIRADC: 'HIRADC',
  CORPORATE_RISK: 'CORPORATE_RISK',
  ALL: 'ALL'
};

exports.RiskMatrixAxis = exports.$Enums.RiskMatrixAxis = {
  LIKELIHOOD: 'LIKELIHOOD',
  SEVERITY: 'SEVERITY'
};

exports.HazardCategory = exports.$Enums.HazardCategory = {
  PHYSICAL: 'PHYSICAL',
  CHEMICAL: 'CHEMICAL',
  BIOLOGICAL: 'BIOLOGICAL',
  ERGONOMIC: 'ERGONOMIC',
  PSYCHOSOCIAL: 'PSYCHOSOCIAL',
  MECHANICAL: 'MECHANICAL',
  ELECTRICAL: 'ELECTRICAL',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  OTHER: 'OTHER'
};

exports.HazardRegisterStatus = exports.$Enums.HazardRegisterStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.HiraAssessmentType = exports.$Enums.HiraAssessmentType = {
  ROUTINE: 'ROUTINE',
  NON_ROUTINE: 'NON_ROUTINE',
  PROJECT_BASED: 'PROJECT_BASED',
  PERIODIC_REVIEW: 'PERIODIC_REVIEW'
};

exports.HiraAssessmentStatus = exports.$Enums.HiraAssessmentStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  REQUIRES_REVISION: 'REQUIRES_REVISION',
  ARCHIVED: 'ARCHIVED'
};

exports.ControlHierarchy = exports.$Enums.ControlHierarchy = {
  ELIMINATION: 'ELIMINATION',
  SUBSTITUTION: 'SUBSTITUTION',
  ENGINEERING: 'ENGINEERING',
  ADMINISTRATIVE: 'ADMINISTRATIVE',
  PPE: 'PPE'
};

exports.JsaRecordStatus = exports.$Enums.JsaRecordStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED'
};

exports.HiradcRecordStatus = exports.$Enums.HiradcRecordStatus = {
  DRAFT: 'DRAFT',
  VERIFIED: 'VERIFIED',
  APPROVED: 'APPROVED',
  EXPIRED: 'EXPIRED'
};

exports.RiskCategory = exports.$Enums.RiskCategory = {
  STRATEGIC: 'STRATEGIC',
  OPERATIONAL: 'OPERATIONAL',
  FINANCIAL: 'FINANCIAL',
  COMPLIANCE: 'COMPLIANCE',
  REPUTATIONAL: 'REPUTATIONAL',
  HSE: 'HSE',
  IT_SECURITY: 'IT_SECURITY',
  OTHER: 'OTHER'
};

exports.RiskAppetiteStatus = exports.$Enums.RiskAppetiteStatus = {
  WITHIN_APPETITE: 'WITHIN_APPETITE',
  EXCEEDS_APPETITE: 'EXCEEDS_APPETITE'
};

exports.CorporateRiskStatus = exports.$Enums.CorporateRiskStatus = {
  IDENTIFIED: 'IDENTIFIED',
  ASSESSED: 'ASSESSED',
  TREATMENT_IN_PROGRESS: 'TREATMENT_IN_PROGRESS',
  MONITORED: 'MONITORED',
  CLOSED: 'CLOSED'
};

exports.RiskTreatmentSourceType = exports.$Enums.RiskTreatmentSourceType = {
  RISK_REGISTER: 'RISK_REGISTER',
  HIRA_LINE: 'HIRA_LINE',
  HIRADC_LINE: 'HIRADC_LINE'
};

exports.RiskTreatmentStrategy = exports.$Enums.RiskTreatmentStrategy = {
  AVOID: 'AVOID',
  REDUCE_MITIGATE: 'REDUCE_MITIGATE',
  TRANSFER: 'TRANSFER',
  ACCEPT: 'ACCEPT'
};

exports.RiskTreatmentStatus = exports.$Enums.RiskTreatmentStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  VERIFIED_EFFECTIVE: 'VERIFIED_EFFECTIVE',
  CANCELLED: 'CANCELLED'
};

exports.WorkPermitRiskLevel = exports.$Enums.WorkPermitRiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

exports.WorkPermitStatus = exports.$Enums.WorkPermitStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PENDING_ISSUER_APPROVAL: 'PENDING_ISSUER_APPROVAL',
  PENDING_HSE_APPROVAL: 'PENDING_HSE_APPROVAL',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  EXTENSION_REQUESTED: 'EXTENSION_REQUESTED',
  PENDING_CLOSURE: 'PENDING_CLOSURE',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

exports.GasType = exports.$Enums.GasType = {
  OXYGEN: 'OXYGEN',
  LEL_FLAMMABLE: 'LEL_FLAMMABLE',
  H2S: 'H2S',
  CO: 'CO',
  VOC: 'VOC',
  OTHER: 'OTHER'
};

exports.GasTestResultValue = exports.$Enums.GasTestResultValue = {
  PASS: 'PASS',
  FAIL: 'FAIL'
};

exports.IsolationType = exports.$Enums.IsolationType = {
  ELECTRICAL: 'ELECTRICAL',
  MECHANICAL: 'MECHANICAL',
  PROCESS_PIPING: 'PROCESS_PIPING',
  PNEUMATIC: 'PNEUMATIC',
  HYDRAULIC: 'HYDRAULIC',
  OTHER: 'OTHER'
};

exports.IsolationLotoStatus = exports.$Enums.IsolationLotoStatus = {
  APPLIED: 'APPLIED',
  VERIFIED: 'VERIFIED',
  REMOVED: 'REMOVED'
};

exports.WorkPermitApprovalDecision = exports.$Enums.WorkPermitApprovalDecision = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.WorkPermitExtensionStatus = exports.$Enums.WorkPermitExtensionStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.WorkPermitClosureStatus = exports.$Enums.WorkPermitClosureStatus = {
  SUBMITTED: 'SUBMITTED',
  VERIFIED: 'VERIFIED',
  CLOSED: 'CLOSED',
  RETURNED: 'RETURNED'
};

exports.IncidentClassification = exports.$Enums.IncidentClassification = {
  NEAR_MISS: 'NEAR_MISS',
  FIRST_AID: 'FIRST_AID',
  MEDICAL_TREATMENT: 'MEDICAL_TREATMENT',
  RESTRICTED_WORK_CASE: 'RESTRICTED_WORK_CASE',
  LOST_TIME_INJURY: 'LOST_TIME_INJURY',
  FATALITY: 'FATALITY',
  PROPERTY_DAMAGE: 'PROPERTY_DAMAGE',
  ENVIRONMENTAL_SPILL: 'ENVIRONMENTAL_SPILL',
  PROCESS_SAFETY_EVENT: 'PROCESS_SAFETY_EVENT'
};

exports.IncidentSeverityLevel = exports.$Enums.IncidentSeverityLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.IncidentReportStatus = exports.$Enums.IncidentReportStatus = {
  REPORTED: 'REPORTED',
  UNDER_VERIFICATION: 'UNDER_VERIFICATION',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  INVESTIGATION_COMPLETED: 'INVESTIGATION_COMPLETED',
  PENDING_REGULATORY_REPORT: 'PENDING_REGULATORY_REPORT',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED'
};

exports.IncidentInvestigationMethod = exports.$Enums.IncidentInvestigationMethod = {
  FIVE_WHY: 'FIVE_WHY',
  FISHBONE: 'FISHBONE',
  BOWTIE: 'BOWTIE',
  OTHER: 'OTHER'
};

exports.IncidentInvestigationStatus = exports.$Enums.IncidentInvestigationStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  RETURNED: 'RETURNED'
};

exports.IncidentInvestigationTeamRole = exports.$Enums.IncidentInvestigationTeamRole = {
  LEAD: 'LEAD',
  MEMBER: 'MEMBER',
  SME: 'SME',
  OBSERVER: 'OBSERVER'
};

exports.IncidentRootCauseType = exports.$Enums.IncidentRootCauseType = {
  IMMEDIATE_CAUSE: 'IMMEDIATE_CAUSE',
  ROOT_CAUSE: 'ROOT_CAUSE',
  CONTRIBUTING_FACTOR: 'CONTRIBUTING_FACTOR'
};

exports.IncidentRootCauseCategory = exports.$Enums.IncidentRootCauseCategory = {
  PEOPLE: 'PEOPLE',
  EQUIPMENT_MATERIAL: 'EQUIPMENT_MATERIAL',
  PROCESS_PROCEDURE: 'PROCESS_PROCEDURE',
  ENVIRONMENT: 'ENVIRONMENT',
  MANAGEMENT_SYSTEM: 'MANAGEMENT_SYSTEM'
};

exports.IncidentRegulatoryBody = exports.$Enums.IncidentRegulatoryBody = {
  KEMNAKER: 'KEMNAKER',
  BPJS_KETENAGAKERJAAN: 'BPJS_KETENAGAKERJAAN',
  DISNAKER: 'DISNAKER',
  DLH_KLHK: 'DLH_KLHK',
  SKK_MIGAS: 'SKK_MIGAS',
  OTHER: 'OTHER'
};

exports.IncidentRegulatoryReportStatus = exports.$Enums.IncidentRegulatoryReportStatus = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  OVERDUE: 'OVERDUE'
};

exports.IncidentStatisticsPeriodType = exports.$Enums.IncidentStatisticsPeriodType = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
  ROLLING_12M: 'ROLLING_12M'
};

exports.InspectionScoringMethod = exports.$Enums.InspectionScoringMethod = {
  PASS_FAIL_ONLY: 'PASS_FAIL_ONLY',
  WEIGHTED_SCORE: 'WEIGHTED_SCORE',
  CHECKLIST_NO_SCORE: 'CHECKLIST_NO_SCORE'
};

exports.InspectionResponseType = exports.$Enums.InspectionResponseType = {
  PASS_FAIL: 'PASS_FAIL',
  YES_NO: 'YES_NO',
  SCALE_1_5: 'SCALE_1_5',
  TEXT: 'TEXT',
  NUMERIC: 'NUMERIC'
};

exports.InspectionRecurrencePattern = exports.$Enums.InspectionRecurrencePattern = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  CUSTOM_CRON: 'CUSTOM_CRON'
};

exports.InspectionRecordStatus = exports.$Enums.InspectionRecordStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED'
};

exports.InspectionOverallResult = exports.$Enums.InspectionOverallResult = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  NA: 'NA'
};

exports.InspectionFindingSeverity = exports.$Enums.InspectionFindingSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

exports.InspectionFindingStatus = exports.$Enums.InspectionFindingStatus = {
  OPEN: 'OPEN',
  ACTION_ASSIGNED: 'ACTION_ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED',
  ESCALATED_TO_CAPA: 'ESCALATED_TO_CAPA'
};

exports.EmergencyType = exports.$Enums.EmergencyType = {
  FIRE: 'FIRE',
  EARTHQUAKE: 'EARTHQUAKE',
  HAZMAT_SPILL: 'HAZMAT_SPILL',
  MEDICAL_EMERGENCY: 'MEDICAL_EMERGENCY',
  FLOOD: 'FLOOD',
  CIVIL_UNREST: 'CIVIL_UNREST',
  EXPLOSION: 'EXPLOSION',
  STRUCTURAL_COLLAPSE: 'STRUCTURAL_COLLAPSE',
  SEVERE_WEATHER: 'SEVERE_WEATHER',
  SECURITY_THREAT: 'SECURITY_THREAT',
  OTHER: 'OTHER'
};

exports.EmergencyPlanSeverityLevel = exports.$Enums.EmergencyPlanSeverityLevel = {
  LEVEL_1_LOCAL: 'LEVEL_1_LOCAL',
  LEVEL_2_SITE_WIDE: 'LEVEL_2_SITE_WIDE',
  LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY: 'LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY'
};

exports.EmergencyPlanReviewFrequency = exports.$Enums.EmergencyPlanReviewFrequency = {
  ANNUAL: 'ANNUAL',
  BIENNIAL: 'BIENNIAL'
};

exports.EmergencyPlanStatus = exports.$Enums.EmergencyPlanStatus = {
  DRAFT: 'DRAFT',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED_ACTIVE: 'APPROVED_ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  ARCHIVED: 'ARCHIVED'
};

exports.ErtRole = exports.$Enums.ErtRole = {
  INCIDENT_COMMANDER: 'INCIDENT_COMMANDER',
  DEPUTY_INCIDENT_COMMANDER: 'DEPUTY_INCIDENT_COMMANDER',
  FIRE_WARDEN: 'FIRE_WARDEN',
  FIRST_AIDER: 'FIRST_AIDER',
  EVACUATION_MARSHAL: 'EVACUATION_MARSHAL',
  SECURITY_COORDINATOR: 'SECURITY_COORDINATOR',
  COMMUNICATION_OFFICER: 'COMMUNICATION_OFFICER',
  HAZMAT_RESPONSE_OFFICER: 'HAZMAT_RESPONSE_OFFICER',
  ASSEMBLY_POINT_COORDINATOR: 'ASSEMBLY_POINT_COORDINATOR',
  OTHER: 'OTHER'
};

exports.EmergencyTeamType = exports.$Enums.EmergencyTeamType = {
  SITE_WIDE: 'SITE_WIDE',
  SHIFT_BASED: 'SHIFT_BASED',
  BUILDING_SPECIFIC: 'BUILDING_SPECIFIC'
};

exports.EmergencyTeamMemberStatus = exports.$Enums.EmergencyTeamMemberStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.EmergencyContactCategory = exports.$Enums.EmergencyContactCategory = {
  INTERNAL_ERT: 'INTERNAL_ERT',
  HOSPITAL: 'HOSPITAL',
  FIRE_DEPARTMENT: 'FIRE_DEPARTMENT',
  POLICE: 'POLICE',
  AMBULANCE: 'AMBULANCE',
  GOVERNMENT_AGENCY: 'GOVERNMENT_AGENCY',
  SKK_MIGAS: 'SKK_MIGAS',
  ENVIRONMENTAL_AGENCY: 'ENVIRONMENTAL_AGENCY',
  UTILITY_PLN_PDAM: 'UTILITY_PLN_PDAM',
  POISON_CONTROL: 'POISON_CONTROL',
  OTHER: 'OTHER'
};

exports.EmergencyDrillType = exports.$Enums.EmergencyDrillType = {
  TABLETOP: 'TABLETOP',
  FUNCTIONAL: 'FUNCTIONAL',
  FULL_SCALE_EVACUATION: 'FULL_SCALE_EVACUATION'
};

exports.EmergencyDrillStatus = exports.$Enums.EmergencyDrillStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.EmergencyPersonType = exports.$Enums.EmergencyPersonType = {
  EMPLOYEE: 'EMPLOYEE',
  CONTRACTOR: 'CONTRACTOR',
  VISITOR: 'VISITOR'
};

exports.DrillAttendanceStatus = exports.$Enums.DrillAttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  EXCUSED: 'EXCUSED'
};

exports.EmergencyActivationTriggerContext = exports.$Enums.EmergencyActivationTriggerContext = {
  DRILL: 'DRILL',
  REAL_EMERGENCY: 'REAL_EMERGENCY'
};

exports.EmergencyActivationStatus = exports.$Enums.EmergencyActivationStatus = {
  ACTIVE: 'ACTIVE',
  ALL_CLEAR_DECLARED: 'ALL_CLEAR_DECLARED',
  STOOD_DOWN: 'STOOD_DOWN'
};

exports.MusterCheckinMethod = exports.$Enums.MusterCheckinMethod = {
  SELF_APP_CHECKIN: 'SELF_APP_CHECKIN',
  MARSHAL_MANUAL_ENTRY: 'MARSHAL_MANUAL_ENTRY'
};

exports.EquipmentReadinessStatus = exports.$Enums.EquipmentReadinessStatus = {
  READY: 'READY',
  NEEDS_ATTENTION: 'NEEDS_ATTENTION',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE',
  MISSING: 'MISSING'
};

exports.AuditProgramStatus = exports.$Enums.AuditProgramStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.AuditProgramPlanItemStatus = exports.$Enums.AuditProgramPlanItemStatus = {
  PLANNED: 'PLANNED',
  SCHEDULED: 'SCHEDULED',
  EXECUTED: 'EXECUTED',
  CANCELLED: 'CANCELLED'
};

exports.AuditStatus = exports.$Enums.AuditStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  REPORT_DRAFTED: 'REPORT_DRAFTED',
  REPORT_APPROVED: 'REPORT_APPROVED',
  PENDING_CAPA_CLOSURE: 'PENDING_CAPA_CLOSURE',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
};

exports.AuditTeamRole = exports.$Enums.AuditTeamRole = {
  LEAD_AUDITOR: 'LEAD_AUDITOR',
  AUDITOR: 'AUDITOR',
  TECHNICAL_EXPERT: 'TECHNICAL_EXPERT',
  OBSERVER: 'OBSERVER',
  TRAINEE_AUDITOR: 'TRAINEE_AUDITOR'
};

exports.AuditFindingClassification = exports.$Enums.AuditFindingClassification = {
  MAJOR_NC: 'MAJOR_NC',
  MINOR_NC: 'MINOR_NC',
  OBSERVATION: 'OBSERVATION',
  OFI: 'OFI'
};

exports.AuditFindingStatus = exports.$Enums.AuditFindingStatus = {
  OPEN: 'OPEN',
  CAPA_LINKED: 'CAPA_LINKED',
  VERIFIED: 'VERIFIED',
  CLOSED: 'CLOSED'
};

exports.AuditorCompetencyType = exports.$Enums.AuditorCompetencyType = {
  LEAD_AUDITOR_CERT: 'LEAD_AUDITOR_CERT',
  AUDITOR_CERT: 'AUDITOR_CERT',
  TECHNICAL_EXPERT_QUALIFICATION: 'TECHNICAL_EXPERT_QUALIFICATION'
};

exports.AuditorCompetencyStatus = exports.$Enums.AuditorCompetencyStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

exports.CapaSourceType = exports.$Enums.CapaSourceType = {
  INCIDENT: 'INCIDENT',
  AUDIT_FINDING: 'AUDIT_FINDING',
  INSPECTION_FINDING: 'INSPECTION_FINDING',
  COMPLIANCE: 'COMPLIANCE',
  RISK: 'RISK',
  CUSTOMER_COMPLAINT: 'CUSTOMER_COMPLAINT',
  QUALITY_NCR: 'QUALITY_NCR',
  MANAGEMENT_REVIEW: 'MANAGEMENT_REVIEW',
  OTHER: 'OTHER',
  ENVIRONMENTAL_ASPECT_IMPACT: 'ENVIRONMENTAL_ASPECT_IMPACT',
  ENVIRONMENTAL_MONITORING: 'ENVIRONMENTAL_MONITORING',
  OCCUPATIONAL_DISEASE_CASE: 'OCCUPATIONAL_DISEASE_CASE',
  CALIBRATION_OOT: 'CALIBRATION_OOT'
};

exports.CapaCategory = exports.$Enums.CapaCategory = {
  CORRECTIVE: 'CORRECTIVE',
  PREVENTIVE: 'PREVENTIVE'
};

exports.CapaPriority = exports.$Enums.CapaPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.CapaRegisterStatus = exports.$Enums.CapaRegisterStatus = {
  DRAFT: 'DRAFT',
  ROOT_CAUSE_ANALYSIS: 'ROOT_CAUSE_ANALYSIS',
  ACTION_PLAN_DEFINED: 'ACTION_PLAN_DEFINED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_EFFECTIVENESS_VERIFICATION: 'PENDING_EFFECTIVENESS_VERIFICATION',
  EFFECTIVE_CLOSED: 'EFFECTIVE_CLOSED',
  NOT_EFFECTIVE_REOPENED: 'NOT_EFFECTIVE_REOPENED',
  CANCELLED: 'CANCELLED'
};

exports.CapaRootCauseMethod = exports.$Enums.CapaRootCauseMethod = {
  FIVE_WHY: 'FIVE_WHY',
  FISHBONE: 'FISHBONE',
  FAULT_TREE: 'FAULT_TREE',
  OTHER: 'OTHER'
};

exports.CapaActionType = exports.$Enums.CapaActionType = {
  CORRECTIVE: 'CORRECTIVE',
  PREVENTIVE: 'PREVENTIVE',
  INTERIM_CONTAINMENT: 'INTERIM_CONTAINMENT'
};

exports.CapaActionPlanStatusCache = exports.$Enums.CapaActionPlanStatusCache = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE'
};

exports.CapaVerificationMethod = exports.$Enums.CapaVerificationMethod = {
  RE_AUDIT: 'RE_AUDIT',
  RE_INSPECTION: 'RE_INSPECTION',
  DATA_TREND_ANALYSIS: 'DATA_TREND_ANALYSIS',
  FIELD_OBSERVATION: 'FIELD_OBSERVATION',
  OTHER: 'OTHER'
};

exports.CapaVerificationResult = exports.$Enums.CapaVerificationResult = {
  PENDING: 'PENDING',
  EFFECTIVE: 'EFFECTIVE',
  NOT_EFFECTIVE: 'NOT_EFFECTIVE'
};

exports.CapaApprovalDecision = exports.$Enums.CapaApprovalDecision = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RETURNED: 'RETURNED'
};

exports.QualityNcrSource = exports.$Enums.QualityNcrSource = {
  INTERNAL: 'INTERNAL',
  CUSTOMER: 'CUSTOMER',
  SUPPLIER: 'SUPPLIER'
};

exports.QualityNcrDetectionStage = exports.$Enums.QualityNcrDetectionStage = {
  INCOMING: 'INCOMING',
  IN_PROCESS: 'IN_PROCESS',
  FINAL: 'FINAL',
  POST_DELIVERY: 'POST_DELIVERY',
  AUDIT_FINDING: 'AUDIT_FINDING'
};

exports.QualityNcrSeverity = exports.$Enums.QualityNcrSeverity = {
  MINOR: 'MINOR',
  MAJOR: 'MAJOR',
  CRITICAL: 'CRITICAL'
};

exports.QualityNcrDisposition = exports.$Enums.QualityNcrDisposition = {
  USE_AS_IS: 'USE_AS_IS',
  REWORK: 'REWORK',
  REPAIR: 'REPAIR',
  SCRAP: 'SCRAP',
  RETURN_TO_SUPPLIER: 'RETURN_TO_SUPPLIER',
  REGRADE: 'REGRADE',
  PENDING: 'PENDING'
};

exports.QualityNcrReInspectionResult = exports.$Enums.QualityNcrReInspectionResult = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_YET: 'NOT_YET'
};

exports.QualityNcrStatus = exports.$Enums.QualityNcrStatus = {
  OPEN: 'OPEN',
  CONTAINMENT: 'CONTAINMENT',
  DISPOSITION_PENDING: 'DISPOSITION_PENDING',
  DISPOSITIONED: 'DISPOSITIONED',
  CAPA_LINKED: 'CAPA_LINKED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
};

exports.QualityComplaintChannel = exports.$Enums.QualityComplaintChannel = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  PORTAL: 'PORTAL',
  LETTER: 'LETTER',
  SALES_VISIT: 'SALES_VISIT',
  OTHER: 'OTHER'
};

exports.QualityComplaintCategory = exports.$Enums.QualityComplaintCategory = {
  PRODUCT_QUALITY: 'PRODUCT_QUALITY',
  DELIVERY: 'DELIVERY',
  DOCUMENTATION: 'DOCUMENTATION',
  SERVICE: 'SERVICE',
  OTHER: 'OTHER'
};

exports.QualityComplaintSeverity = exports.$Enums.QualityComplaintSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.QualityComplaintStatus = exports.$Enums.QualityComplaintStatus = {
  RECEIVED: 'RECEIVED',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  CAPA_IN_PROGRESS: 'CAPA_IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  REJECTED_INVALID: 'REJECTED_INVALID'
};

exports.QualityInspectionType = exports.$Enums.QualityInspectionType = {
  INCOMING: 'INCOMING',
  IN_PROCESS: 'IN_PROCESS',
  FINAL: 'FINAL',
  PRE_SHIPMENT: 'PRE_SHIPMENT'
};

exports.QualityInspectionResultStatus = exports.$Enums.QualityInspectionResultStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  CONDITIONAL_PASS: 'CONDITIONAL_PASS',
  PENDING: 'PENDING'
};

exports.QualityInspectionDisposition = exports.$Enums.QualityInspectionDisposition = {
  ACCEPT: 'ACCEPT',
  REJECT: 'REJECT',
  REWORK: 'REWORK',
  USE_AS_IS_DEVIATION: 'USE_AS_IS_DEVIATION'
};

exports.QualityInspectionStatus = exports.$Enums.QualityInspectionStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  REVIEWED: 'REVIEWED',
  CLOSED: 'CLOSED'
};

exports.QualityInspectionParameterResult = exports.$Enums.QualityInspectionParameterResult = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_MEASURED: 'NOT_MEASURED'
};

exports.QualitySupplierCategory = exports.$Enums.QualitySupplierCategory = {
  RAW_MATERIAL: 'RAW_MATERIAL',
  PACKAGING: 'PACKAGING',
  SERVICE: 'SERVICE',
  SUBCONTRACTOR: 'SUBCONTRACTOR',
  OTHER: 'OTHER'
};

exports.QualitySupplierEvaluationType = exports.$Enums.QualitySupplierEvaluationType = {
  INITIAL_QUALIFICATION: 'INITIAL_QUALIFICATION',
  PERIODIC_EVALUATION: 'PERIODIC_EVALUATION',
  RE_EVALUATION_POST_NCR: 'RE_EVALUATION_POST_NCR'
};

exports.QualitySupplierRating = exports.$Enums.QualitySupplierRating = {
  APPROVED: 'APPROVED',
  CONDITIONAL: 'CONDITIONAL',
  SUSPENDED: 'SUSPENDED',
  DISQUALIFIED: 'DISQUALIFIED'
};

exports.QualitySupplierRecordStatus = exports.$Enums.QualitySupplierRecordStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  ARCHIVED: 'ARCHIVED'
};

exports.QualityObjectiveMeasurementFrequency = exports.$Enums.QualityObjectiveMeasurementFrequency = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  SEMI_ANNUAL: 'SEMI_ANNUAL',
  ANNUAL: 'ANNUAL'
};

exports.QualityObjectiveStatus = exports.$Enums.QualityObjectiveStatus = {
  ON_TRACK: 'ON_TRACK',
  AT_RISK: 'AT_RISK',
  OFF_TRACK: 'OFF_TRACK',
  ACHIEVED: 'ACHIEVED',
  NOT_ACHIEVED: 'NOT_ACHIEVED',
  DISCONTINUED: 'DISCONTINUED'
};

exports.EnvLifeCycleStage = exports.$Enums.EnvLifeCycleStage = {
  INPUT_PROCUREMENT: 'INPUT_PROCUREMENT',
  PRODUCTION: 'PRODUCTION',
  STORAGE: 'STORAGE',
  DISTRIBUTION: 'DISTRIBUTION',
  USE: 'USE',
  END_OF_LIFE: 'END_OF_LIFE'
};

exports.EnvConditionType = exports.$Enums.EnvConditionType = {
  NORMAL: 'NORMAL',
  ABNORMAL: 'ABNORMAL',
  EMERGENCY: 'EMERGENCY'
};

exports.EnvImpactType = exports.$Enums.EnvImpactType = {
  AIR: 'AIR',
  WATER: 'WATER',
  LAND_SOIL: 'LAND_SOIL',
  WASTE: 'WASTE',
  NOISE: 'NOISE',
  RESOURCE_CONSUMPTION: 'RESOURCE_CONSUMPTION',
  BIODIVERSITY: 'BIODIVERSITY',
  OTHER: 'OTHER'
};

exports.EnvSignificanceLevel = exports.$Enums.EnvSignificanceLevel = {
  NOT_SIGNIFICANT: 'NOT_SIGNIFICANT',
  SIGNIFICANT: 'SIGNIFICANT'
};

exports.EnvAspectImpactStatus = exports.$Enums.EnvAspectImpactStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ARCHIVED: 'ARCHIVED'
};

exports.EnvMonitoringType = exports.$Enums.EnvMonitoringType = {
  AIR_EMISSION: 'AIR_EMISSION',
  AMBIENT_AIR: 'AMBIENT_AIR',
  WASTEWATER_EFFLUENT: 'WASTEWATER_EFFLUENT',
  NOISE: 'NOISE',
  VIBRATION: 'VIBRATION',
  SOIL: 'SOIL',
  GROUNDWATER: 'GROUNDWATER'
};

exports.EnvComplianceStatus = exports.$Enums.EnvComplianceStatus = {
  COMPLIANT: 'COMPLIANT',
  EXCEED: 'EXCEED',
  NOT_APPLICABLE: 'NOT_APPLICABLE'
};

exports.EnvMonitoringRecordStatus = exports.$Enums.EnvMonitoringRecordStatus = {
  RECORDED: 'RECORDED',
  VERIFIED: 'VERIFIED',
  REPORTED_TO_REGULATOR: 'REPORTED_TO_REGULATOR'
};

exports.EnvWasteType = exports.$Enums.EnvWasteType = {
  HAZARDOUS_B3: 'HAZARDOUS_B3',
  NON_HAZARDOUS: 'NON_HAZARDOUS'
};

exports.EnvWasteUnitOfMeasure = exports.$Enums.EnvWasteUnitOfMeasure = {
  KG: 'KG',
  TON: 'TON',
  LITER: 'LITER',
  DRUM: 'DRUM'
};

exports.EnvWastePackagingType = exports.$Enums.EnvWastePackagingType = {
  DRUM: 'DRUM',
  IBC_TANK: 'IBC_TANK',
  JUMBO_BAG: 'JUMBO_BAG',
  OTHER: 'OTHER'
};

exports.EnvManifestStatus = exports.$Enums.EnvManifestStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED_BY_TRANSPORTER: 'RECEIVED_BY_TRANSPORTER',
  RECEIVED_BY_PROCESSOR: 'RECEIVED_BY_PROCESSOR',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED'
};

exports.EnvFestronikSyncStatus = exports.$Enums.EnvFestronikSyncStatus = {
  NOT_SYNCED: 'NOT_SYNCED',
  SYNCED: 'SYNCED',
  SYNC_FAILED: 'SYNC_FAILED'
};

exports.EnvProperAssessmentType = exports.$Enums.EnvProperAssessmentType = {
  INTERNAL_SELF_ASSESSMENT: 'INTERNAL_SELF_ASSESSMENT',
  PRE_SUBMISSION_REVIEW: 'PRE_SUBMISSION_REVIEW'
};

exports.EnvProperRating = exports.$Enums.EnvProperRating = {
  HITAM: 'HITAM',
  MERAH: 'MERAH',
  BIRU: 'BIRU',
  HIJAU: 'HIJAU',
  EMAS: 'EMAS'
};

exports.EnvProperSubmissionStatus = exports.$Enums.EnvProperSubmissionStatus = {
  DRAFT: 'DRAFT',
  INTERNAL_REVIEWED: 'INTERNAL_REVIEWED',
  SUBMITTED_TO_KLHK: 'SUBMITTED_TO_KLHK',
  RESULT_RECEIVED: 'RESULT_RECEIVED'
};

exports.EnvProperCriteriaCategory = exports.$Enums.EnvProperCriteriaCategory = {
  AIR_POLLUTION_CONTROL: 'AIR_POLLUTION_CONTROL',
  WATER_POLLUTION_CONTROL: 'WATER_POLLUTION_CONTROL',
  HAZARDOUS_WASTE_MANAGEMENT: 'HAZARDOUS_WASTE_MANAGEMENT',
  NON_HAZARDOUS_WASTE_3R: 'NON_HAZARDOUS_WASTE_3R',
  AMDAL_UKL_UPL_COMPLIANCE: 'AMDAL_UKL_UPL_COMPLIANCE',
  COMMUNITY_DEVELOPMENT_CSR: 'COMMUNITY_DEVELOPMENT_CSR',
  BIODIVERSITY_CONSERVATION: 'BIODIVERSITY_CONSERVATION',
  ENERGY_EFFICIENCY: 'ENERGY_EFFICIENCY',
  OTHER: 'OTHER'
};

exports.EnvProperCriteriaComplianceStatus = exports.$Enums.EnvProperCriteriaComplianceStatus = {
  FULLY_COMPLIANT: 'FULLY_COMPLIANT',
  PARTIALLY_COMPLIANT: 'PARTIALLY_COMPLIANT',
  NON_COMPLIANT: 'NON_COMPLIANT',
  NOT_APPLICABLE: 'NOT_APPLICABLE'
};

exports.EnvProperEvidenceReferenceType = exports.$Enums.EnvProperEvidenceReferenceType = {
  ENVIRONMENTAL_MONITORING_RECORD: 'ENVIRONMENTAL_MONITORING_RECORD',
  WASTE_MANIFEST_RECORD: 'WASTE_MANIFEST_RECORD',
  DOCUMENT: 'DOCUMENT',
  OTHER: 'OTHER'
};

exports.EnvPermitMedia = exports.$Enums.EnvPermitMedia = {
  AIR_EMISSION: 'AIR_EMISSION',
  WASTEWATER: 'WASTEWATER',
  AMDAL: 'AMDAL',
  UKL_UPL: 'UKL_UPL',
  HAZARDOUS_WASTE_STORAGE_TPS_LB3: 'HAZARDOUS_WASTE_STORAGE_TPS_LB3',
  WASTE_UTILIZATION: 'WASTE_UTILIZATION',
  WATER_ABSTRACTION: 'WATER_ABSTRACTION',
  OTHER: 'OTHER'
};

exports.EnvPermitMonitoringFrequency = exports.$Enums.EnvPermitMonitoringFrequency = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  SEMI_ANNUAL: 'SEMI_ANNUAL',
  ANNUAL: 'ANNUAL'
};

exports.OhMedicalRecordStatus = exports.$Enums.OhMedicalRecordStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  ANONYMIZED: 'ANONYMIZED'
};

exports.OhMcuType = exports.$Enums.OhMcuType = {
  PRE_EMPLOYMENT: 'PRE_EMPLOYMENT',
  PERIODIC: 'PERIODIC',
  SPECIAL: 'SPECIAL',
  EXIT: 'EXIT'
};

exports.OhMcuScheduleStatus = exports.$Enums.OhMcuScheduleStatus = {
  SCHEDULED: 'SCHEDULED',
  RESCHEDULED: 'RESCHEDULED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
  CANCELLED: 'CANCELLED'
};

exports.OhMcuResultOverall = exports.$Enums.OhMcuResultOverall = {
  NORMAL: 'NORMAL',
  MINOR_FINDING: 'MINOR_FINDING',
  MAJOR_FINDING: 'MAJOR_FINDING',
  REQUIRES_FOLLOW_UP: 'REQUIRES_FOLLOW_UP'
};

exports.OhMcuResultStatus = exports.$Enums.OhMcuResultStatus = {
  DRAFT: 'DRAFT',
  FINALIZED: 'FINALIZED',
  SHARED_WITH_EMPLOYEE: 'SHARED_WITH_EMPLOYEE'
};

exports.OhFitToWorkTrigger = exports.$Enums.OhFitToWorkTrigger = {
  POST_MCU: 'POST_MCU',
  POST_INCIDENT: 'POST_INCIDENT',
  POST_SICK_LEAVE: 'POST_SICK_LEAVE',
  PRE_ASSIGNMENT_HIGH_RISK_TASK: 'PRE_ASSIGNMENT_HIGH_RISK_TASK',
  RANDOM_CHECK: 'RANDOM_CHECK',
  ROUTINE: 'ROUTINE'
};

exports.OhFitStatus = exports.$Enums.OhFitStatus = {
  FIT: 'FIT',
  FIT_WITH_RESTRICTION: 'FIT_WITH_RESTRICTION',
  TEMPORARY_UNFIT: 'TEMPORARY_UNFIT',
  UNFIT: 'UNFIT'
};

exports.OhFitToWorkAssessmentStatus = exports.$Enums.OhFitToWorkAssessmentStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  SUPERSEDED: 'SUPERSEDED'
};

exports.OhDiseaseCategory = exports.$Enums.OhDiseaseCategory = {
  RESPIRATORY: 'RESPIRATORY',
  MUSCULOSKELETAL: 'MUSCULOSKELETAL',
  HEARING_LOSS_NIHL: 'HEARING_LOSS_NIHL',
  SKIN_DERMATITIS: 'SKIN_DERMATITIS',
  CHEMICAL_POISONING: 'CHEMICAL_POISONING',
  OTHER: 'OTHER'
};

exports.OhSeverityClassification = exports.$Enums.OhSeverityClassification = {
  MILD: 'MILD',
  MODERATE: 'MODERATE',
  SEVERE: 'SEVERE',
  PERMANENT_DISABILITY: 'PERMANENT_DISABILITY',
  FATAL: 'FATAL'
};

exports.OhWorkRelatedness = exports.$Enums.OhWorkRelatedness = {
  CONFIRMED_WORK_RELATED: 'CONFIRMED_WORK_RELATED',
  SUSPECTED: 'SUSPECTED',
  NOT_WORK_RELATED: 'NOT_WORK_RELATED',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION'
};

exports.OhPakCaseStatus = exports.$Enums.OhPakCaseStatus = {
  OPEN: 'OPEN',
  UNDER_TREATMENT: 'UNDER_TREATMENT',
  RECOVERED: 'RECOVERED',
  PERMANENT_IMPAIRMENT: 'PERMANENT_IMPAIRMENT',
  CLOSED: 'CLOSED',
  DECEASED: 'DECEASED'
};

exports.OhVisitorType = exports.$Enums.OhVisitorType = {
  EMPLOYEE: 'EMPLOYEE',
  CONTRACTOR: 'CONTRACTOR',
  VISITOR: 'VISITOR'
};

exports.OhVisitType = exports.$Enums.OhVisitType = {
  ILLNESS: 'ILLNESS',
  INJURY_MINOR: 'INJURY_MINOR',
  FOLLOW_UP: 'FOLLOW_UP',
  MEDICATION_REQUEST: 'MEDICATION_REQUEST',
  CONSULTATION: 'CONSULTATION',
  ROUTINE_CHECK: 'ROUTINE_CHECK'
};

exports.OhWorkStatusAfterVisit = exports.$Enums.OhWorkStatusAfterVisit = {
  RETURN_TO_WORK: 'RETURN_TO_WORK',
  SENT_HOME_REST: 'SENT_HOME_REST',
  REFERRED_HOSPITAL: 'REFERRED_HOSPITAL',
  LOST_TIME: 'LOST_TIME'
};

exports.OhClinicVisitStatus = exports.$Enums.OhClinicVisitStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
};

exports.OhExposureType = exports.$Enums.OhExposureType = {
  NOISE: 'NOISE',
  DUST_RESPIRABLE: 'DUST_RESPIRABLE',
  CHEMICAL_HAZARD: 'CHEMICAL_HAZARD',
  RADIATION: 'RADIATION',
  VIBRATION: 'VIBRATION',
  ERGONOMIC: 'ERGONOMIC',
  BIOLOGICAL_HAZARD: 'BIOLOGICAL_HAZARD',
  EXTREME_TEMPERATURE: 'EXTREME_TEMPERATURE',
  OTHER: 'OTHER'
};

exports.OhMonitoringFrequency = exports.$Enums.OhMonitoringFrequency = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  SEMI_ANNUAL: 'SEMI_ANNUAL',
  ANNUAL: 'ANNUAL'
};

exports.OhSurveillanceProgramStatus = exports.$Enums.OhSurveillanceProgramStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  COMPLETED: 'COMPLETED'
};

exports.OhRestrictionType = exports.$Enums.OhRestrictionType = {
  NO_HEIGHT_WORK: 'NO_HEIGHT_WORK',
  NO_HEAVY_LIFTING: 'NO_HEAVY_LIFTING',
  NO_CONFINED_SPACE: 'NO_CONFINED_SPACE',
  LIGHT_DUTY_ONLY: 'LIGHT_DUTY_ONLY',
  REDUCED_HOURS: 'REDUCED_HOURS',
  NO_NIGHT_SHIFT: 'NO_NIGHT_SHIFT',
  NO_CHEMICAL_EXPOSURE: 'NO_CHEMICAL_EXPOSURE',
  OTHER: 'OTHER'
};

exports.OhRestrictedDutyStatus = exports.$Enums.OhRestrictedDutyStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ESCALATED_NON_COMPLIANT: 'ESCALATED_NON_COMPLIANT'
};

exports.OhAuthorizedScopeType = exports.$Enums.OhAuthorizedScopeType = {
  TENANT: 'TENANT',
  COMPANY: 'COMPANY',
  BRANCH: 'BRANCH',
  SITE: 'SITE'
};

exports.OhAuthorizationStatus = exports.$Enums.OhAuthorizationStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

exports.OhAccessEntityType = exports.$Enums.OhAccessEntityType = {
  MEDICAL_RECORD: 'MEDICAL_RECORD',
  MCU_RESULT: 'MCU_RESULT',
  FIT_TO_WORK_ASSESSMENT: 'FIT_TO_WORK_ASSESSMENT',
  PAK_CASE: 'PAK_CASE',
  CLINIC_VISIT: 'CLINIC_VISIT'
};

exports.OhAccessType = exports.$Enums.OhAccessType = {
  VIEW: 'VIEW',
  EXPORT: 'EXPORT',
  PRINT: 'PRINT',
  EDIT: 'EDIT',
  DELETE_REQUEST: 'DELETE_REQUEST'
};

exports.OhAccessReason = exports.$Enums.OhAccessReason = {
  ROUTINE_CONSULTATION: 'ROUTINE_CONSULTATION',
  MCU_REVIEW: 'MCU_REVIEW',
  PAK_INVESTIGATION: 'PAK_INVESTIGATION',
  EMPLOYEE_REQUEST: 'EMPLOYEE_REQUEST',
  AUDIT_REVIEW: 'AUDIT_REVIEW',
  LEGAL_REQUEST: 'LEGAL_REQUEST',
  OTHER: 'OTHER'
};

exports.OhConsentPurpose = exports.$Enums.OhConsentPurpose = {
  MCU_PROCESSING: 'MCU_PROCESSING',
  CLINIC_TREATMENT: 'CLINIC_TREATMENT',
  PAK_INVESTIGATION: 'PAK_INVESTIGATION',
  BPJS_INSURANCE_SHARING: 'BPJS_INSURANCE_SHARING',
  AGGREGATE_STATISTICS_REPORTING: 'AGGREGATE_STATISTICS_REPORTING',
  THIRD_PARTY_LAB_SHARING: 'THIRD_PARTY_LAB_SHARING'
};

exports.OhConsentStatus = exports.$Enums.OhConsentStatus = {
  GRANTED: 'GRANTED',
  WITHDRAWN: 'WITHDRAWN',
  EXPIRED: 'EXPIRED'
};

exports.OhConsentChannel = exports.$Enums.OhConsentChannel = {
  DIGITAL_FORM_APP: 'DIGITAL_FORM_APP',
  PAPER_SCANNED: 'PAPER_SCANNED',
  VERBAL_WITNESSED: 'VERBAL_WITNESSED'
};

exports.OhSubjectRequestType = exports.$Enums.OhSubjectRequestType = {
  ACCESS_COPY: 'ACCESS_COPY',
  CORRECTION: 'CORRECTION',
  ERASURE_ANONYMIZATION: 'ERASURE_ANONYMIZATION',
  PROCESSING_RESTRICTION: 'PROCESSING_RESTRICTION'
};

exports.OhSubjectRequestStatus = exports.$Enums.OhSubjectRequestStatus = {
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED'
};

exports.AssetLifecycleStatus = exports.$Enums.AssetLifecycleStatus = {
  ACTIVE: 'ACTIVE',
  UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
  STANDBY: 'STANDBY',
  RETIRED: 'RETIRED',
  DISPOSED: 'DISPOSED'
};

exports.AssetConditionStatus = exports.$Enums.AssetConditionStatus = {
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  POOR: 'POOR',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE'
};

exports.MaintenanceIntervalType = exports.$Enums.MaintenanceIntervalType = {
  DAYS: 'DAYS',
  WEEKS: 'WEEKS',
  MONTHS: 'MONTHS',
  RUNNING_HOURS: 'RUNNING_HOURS'
};

exports.CalibrationItemStatus = exports.$Enums.CalibrationItemStatus = {
  ACTIVE: 'ACTIVE',
  IN_CALIBRATION: 'IN_CALIBRATION',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE',
  RETIRED: 'RETIRED'
};

exports.CalibrationProviderType = exports.$Enums.CalibrationProviderType = {
  INTERNAL_LAB: 'INTERNAL_LAB',
  EXTERNAL_LAB: 'EXTERNAL_LAB'
};

exports.CalibrationScheduleStatus = exports.$Enums.CalibrationScheduleStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
  RESCHEDULED: 'RESCHEDULED'
};

exports.CalibrationResult = exports.$Enums.CalibrationResult = {
  PASS: 'PASS',
  CONDITIONAL_PASS: 'CONDITIONAL_PASS',
  FAIL: 'FAIL'
};

exports.CalibrationCertificateStatus = exports.$Enums.CalibrationCertificateStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  REVIEWED: 'REVIEWED',
  SUPERSEDED: 'SUPERSEDED'
};

exports.OotImpactLevel = exports.$Enums.OotImpactLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.OotStatus = exports.$Enums.OotStatus = {
  IDENTIFIED: 'IDENTIFIED',
  ASSESSED: 'ASSESSED',
  CAPA_INITIATED: 'CAPA_INITIATED',
  CLOSED: 'CLOSED'
};

exports.ContractorType = exports.$Enums.ContractorType = {
  CONSTRUCTION: 'CONSTRUCTION',
  ENGINEERING_SERVICES: 'ENGINEERING_SERVICES',
  LABOR_SUPPLY: 'LABOR_SUPPLY',
  LOGISTICS: 'LOGISTICS',
  CATERING: 'CATERING',
  SECURITY: 'SECURITY',
  OTHER: 'OTHER'
};

exports.ContractorCategory = exports.$Enums.ContractorCategory = {
  TIER_1: 'TIER_1',
  SUB_CONTRACTOR: 'SUB_CONTRACTOR'
};

exports.ContractorRiskRating = exports.$Enums.ContractorRiskRating = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

exports.ContractorStatus = exports.$Enums.ContractorStatus = {
  REGISTERED: 'REGISTERED',
  PREQUALIFIED: 'PREQUALIFIED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BLACKLISTED: 'BLACKLISTED',
  INACTIVE: 'INACTIVE'
};

exports.ContractorPrequalificationType = exports.$Enums.ContractorPrequalificationType = {
  NEW: 'NEW',
  RENEWAL: 'RENEWAL',
  RE_EVALUATION: 'RE_EVALUATION'
};

exports.ContractorPrequalificationResult = exports.$Enums.ContractorPrequalificationResult = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  CONDITIONAL_PASS: 'CONDITIONAL_PASS',
  PENDING: 'PENDING'
};

exports.ContractorPrequalificationStatus = exports.$Enums.ContractorPrequalificationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
};

exports.ContractorDocumentType = exports.$Enums.ContractorDocumentType = {
  SIUJK: 'SIUJK',
  NIB: 'NIB',
  NPWP: 'NPWP',
  INSURANCE_CERT: 'INSURANCE_CERT',
  K3_CERT_COMPANY: 'K3_CERT_COMPANY',
  HSE_PLAN: 'HSE_PLAN',
  EMERGENCY_RESPONSE_PLAN: 'EMERGENCY_RESPONSE_PLAN',
  IUJP: 'IUJP',
  OTHER: 'OTHER'
};

exports.ContractorPqDocumentStatus = exports.$Enums.ContractorPqDocumentStatus = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  NOT_APPLICABLE: 'NOT_APPLICABLE'
};

exports.ContractorComplianceDocumentCategory = exports.$Enums.ContractorComplianceDocumentCategory = {
  BPJS_KETENAGAKERJAAN: 'BPJS_KETENAGAKERJAAN',
  BPJS_KESEHATAN: 'BPJS_KESEHATAN',
  INSURANCE_GENERAL_LIABILITY: 'INSURANCE_GENERAL_LIABILITY',
  INSURANCE_EQUIPMENT: 'INSURANCE_EQUIPMENT',
  SIO_EQUIPMENT: 'SIO_EQUIPMENT',
  IUJP: 'IUJP',
  CSMS_CERTIFICATE: 'CSMS_CERTIFICATE',
  TAX_COMPLIANCE_LETTER: 'TAX_COMPLIANCE_LETTER',
  OTHER: 'OTHER'
};

exports.ContractorComplianceStatus = exports.$Enums.ContractorComplianceStatus = {
  VALID: 'VALID',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
  RENEWAL_IN_PROGRESS: 'RENEWAL_IN_PROGRESS'
};

exports.ContractorWorkerCategory = exports.$Enums.ContractorWorkerCategory = {
  SKILLED: 'SKILLED',
  UNSKILLED: 'UNSKILLED',
  SUPERVISOR: 'SUPERVISOR',
  OPERATOR: 'OPERATOR',
  DRIVER: 'DRIVER',
  OTHER: 'OTHER'
};

exports.ContractorWorkerStatus = exports.$Enums.ContractorWorkerStatus = {
  ACTIVE: 'ACTIVE',
  DEMOBILIZED: 'DEMOBILIZED',
  SUSPENDED: 'SUSPENDED',
  BLACKLISTED: 'BLACKLISTED'
};

exports.ContractorAssignmentStatus = exports.$Enums.ContractorAssignmentStatus = {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  TERMINATED: 'TERMINATED',
  SUSPENDED: 'SUSPENDED'
};

exports.ContractorEvaluationPeriod = exports.$Enums.ContractorEvaluationPeriod = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  SEMI_ANNUAL: 'SEMI_ANNUAL',
  ANNUAL: 'ANNUAL',
  END_OF_CONTRACT: 'END_OF_CONTRACT'
};

exports.ContractorEvaluationRating = exports.$Enums.ContractorEvaluationRating = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  SATISFACTORY: 'SATISFACTORY',
  POOR: 'POOR',
  UNACCEPTABLE: 'UNACCEPTABLE'
};

exports.ContractorEvaluationStatus = exports.$Enums.ContractorEvaluationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED'
};

exports.Prisma.ModelName = {
  RlsSmokeTest: 'RlsSmokeTest',
  User: 'User',
  SessionCacheEntry: 'SessionCacheEntry',
  AuthorizationCodeEntry: 'AuthorizationCodeEntry',
  UserSession: 'UserSession',
  PasswordPolicy: 'PasswordPolicy',
  Role: 'Role',
  PermissionGroup: 'PermissionGroup',
  Permission: 'Permission',
  RolePermission: 'RolePermission',
  UserRole: 'UserRole',
  SsoMapping: 'SsoMapping',
  DelegationOfAuthority: 'DelegationOfAuthority',
  WorkflowDefinition: 'WorkflowDefinition',
  WorkflowStage: 'WorkflowStage',
  WorkflowTransition: 'WorkflowTransition',
  WorkflowInstance: 'WorkflowInstance',
  WorkflowTask: 'WorkflowTask',
  WorkflowDelegation: 'WorkflowDelegation',
  NumberingConfig: 'NumberingConfig',
  Notification: 'Notification',
  NotificationChannel: 'NotificationChannel',
  NotificationTemplate: 'NotificationTemplate',
  NotificationPreference: 'NotificationPreference',
  NotificationLog: 'NotificationLog',
  Attachment: 'Attachment',
  SystemAuditLog: 'SystemAuditLog',
  AuditLogSmokeTest: 'AuditLogSmokeTest',
  Tenant: 'Tenant',
  Company: 'Company',
  Branch: 'Branch',
  Site: 'Site',
  Department: 'Department',
  CostCenter: 'CostCenter',
  Location: 'Location',
  OrganizationChart: 'OrganizationChart',
  IndustryTemplate: 'IndustryTemplate',
  HolidayCalendar: 'HolidayCalendar',
  HolidayCalendarEntry: 'HolidayCalendarEntry',
  SubscriptionPlan: 'SubscriptionPlan',
  TenantSubscription: 'TenantSubscription',
  ModuleEntitlement: 'ModuleEntitlement',
  UsageCounter: 'UsageCounter',
  DataImportJob: 'DataImportJob',
  DataImportError: 'DataImportError',
  TenantBrandingConfig: 'TenantBrandingConfig',
  DocumentCategory: 'DocumentCategory',
  Document: 'Document',
  DocumentVersion: 'DocumentVersion',
  DocumentDistribution: 'DocumentDistribution',
  ReadAcknowledgementLog: 'ReadAcknowledgementLog',
  DocumentReviewSchedule: 'DocumentReviewSchedule',
  RegulatoryFramework: 'RegulatoryFramework',
  RegulatoryRegister: 'RegulatoryRegister',
  ComplianceObligation: 'ComplianceObligation',
  ComplianceEvaluation: 'ComplianceEvaluation',
  LicensePermit: 'LicensePermit',
  RiskMatrixConfig: 'RiskMatrixConfig',
  RiskMatrixLevel: 'RiskMatrixLevel',
  RiskMatrixCell: 'RiskMatrixCell',
  HazardRegister: 'HazardRegister',
  HiraAssessment: 'HiraAssessment',
  HiraTeamMember: 'HiraTeamMember',
  HiraHazardLine: 'HiraHazardLine',
  JsaRecord: 'JsaRecord',
  JsaJobStep: 'JsaJobStep',
  JsaStepHazard: 'JsaStepHazard',
  JsaCrewAcknowledgement: 'JsaCrewAcknowledgement',
  HiradcRecord: 'HiradcRecord',
  HiradcLine: 'HiradcLine',
  RiskRegister: 'RiskRegister',
  RiskTreatmentPlan: 'RiskTreatmentPlan',
  WorkPermitType: 'WorkPermitType',
  WorkPermit: 'WorkPermit',
  WorkPermitHazardChecklist: 'WorkPermitHazardChecklist',
  GasTestResult: 'GasTestResult',
  IsolationLotoRecord: 'IsolationLotoRecord',
  WorkPermitApproval: 'WorkPermitApproval',
  WorkPermitExtension: 'WorkPermitExtension',
  WorkPermitClosure: 'WorkPermitClosure',
  IncidentReport: 'IncidentReport',
  IncidentInvestigation: 'IncidentInvestigation',
  IncidentInvestigationTeam: 'IncidentInvestigationTeam',
  IncidentRootCause: 'IncidentRootCause',
  IncidentCorrectiveAction: 'IncidentCorrectiveAction',
  IncidentWitnessStatement: 'IncidentWitnessStatement',
  IncidentRegulatoryReport: 'IncidentRegulatoryReport',
  IncidentStatisticsCache: 'IncidentStatisticsCache',
  InspectionType: 'InspectionType',
  InspectionChecklistTemplate: 'InspectionChecklistTemplate',
  InspectionChecklistTemplateItem: 'InspectionChecklistTemplateItem',
  InspectionSchedule: 'InspectionSchedule',
  InspectionRecord: 'InspectionRecord',
  InspectionRecordItem: 'InspectionRecordItem',
  InspectionFinding: 'InspectionFinding',
  InspectionScore: 'InspectionScore',
  EmergencyMusterPoint: 'EmergencyMusterPoint',
  EmergencyResponsePlan: 'EmergencyResponsePlan',
  EmergencyResponsePlanStep: 'EmergencyResponsePlanStep',
  EmergencyResponseTeam: 'EmergencyResponseTeam',
  EmergencyResponseTeamMember: 'EmergencyResponseTeamMember',
  EmergencyContact: 'EmergencyContact',
  EmergencyDrill: 'EmergencyDrill',
  DrillParticipationLog: 'DrillParticipationLog',
  EmergencyActivation: 'EmergencyActivation',
  MusterPointCheckin: 'MusterPointCheckin',
  EmergencyEquipmentReadinessChecklist: 'EmergencyEquipmentReadinessChecklist',
  AuditType: 'AuditType',
  AuditChecklist: 'AuditChecklist',
  AuditChecklistItem: 'AuditChecklistItem',
  AuditProgram: 'AuditProgram',
  AuditProgramPlanItem: 'AuditProgramPlanItem',
  Audit: 'Audit',
  AuditTeamMember: 'AuditTeamMember',
  AuditAuditeeScope: 'AuditAuditeeScope',
  AuditFinding: 'AuditFinding',
  AuditorCompetencyRecord: 'AuditorCompetencyRecord',
  AuditReport: 'AuditReport',
  CapaRegister: 'CapaRegister',
  CapaRootCauseAnalysis: 'CapaRootCauseAnalysis',
  CapaActionPlan: 'CapaActionPlan',
  CapaEffectivenessVerification: 'CapaEffectivenessVerification',
  CapaApproval: 'CapaApproval',
  NcrRecord: 'NcrRecord',
  CustomerComplaint: 'CustomerComplaint',
  QualityInspection: 'QualityInspection',
  QualityInspectionParameter: 'QualityInspectionParameter',
  SupplierQualityRecord: 'SupplierQualityRecord',
  QualityObjective: 'QualityObjective',
  QualityObjectiveProgressLog: 'QualityObjectiveProgressLog',
  EnvironmentalAspectImpact: 'EnvironmentalAspectImpact',
  EnvironmentalMonitoringRecord: 'EnvironmentalMonitoringRecord',
  WasteManifestRecord: 'WasteManifestRecord',
  WasteGenerationLog: 'WasteGenerationLog',
  ProperSelfAssessment: 'ProperSelfAssessment',
  ProperSelfAssessmentCriteriaScore: 'ProperSelfAssessmentCriteriaScore',
  EnvironmentalPermit: 'EnvironmentalPermit',
  MedicalRecord: 'MedicalRecord',
  McuSchedule: 'McuSchedule',
  McuResult: 'McuResult',
  FitToWorkAssessment: 'FitToWorkAssessment',
  OccupationalDiseaseCase: 'OccupationalDiseaseCase',
  ClinicVisitLog: 'ClinicVisitLog',
  HealthSurveillanceProgram: 'HealthSurveillanceProgram',
  HealthSurveillanceEnrollment: 'HealthSurveillanceEnrollment',
  RestrictedDutyAssignment: 'RestrictedDutyAssignment',
  OccupationalHealthAuthorizedUser: 'OccupationalHealthAuthorizedUser',
  MedicalRecordAccessLog: 'MedicalRecordAccessLog',
  HealthDataConsent: 'HealthDataConsent',
  HealthDataSubjectRequest: 'HealthDataSubjectRequest',
  TenantEncryptionKey: 'TenantEncryptionKey',
  AssetCategory: 'AssetCategory',
  Asset: 'Asset',
  MaintenanceSchedule: 'MaintenanceSchedule',
  MaintenanceRecord: 'MaintenanceRecord',
  AssetTransferLog: 'AssetTransferLog',
  CalibrationItem: 'CalibrationItem',
  CalibrationProvider: 'CalibrationProvider',
  CalibrationSchedule: 'CalibrationSchedule',
  CalibrationCertificate: 'CalibrationCertificate',
  OutOfToleranceRecord: 'OutOfToleranceRecord',
  Contractor: 'Contractor',
  ContractorPrequalification: 'ContractorPrequalification',
  ContractorPrequalificationDocument: 'ContractorPrequalificationDocument',
  ContractorDocumentCompliance: 'ContractorDocumentCompliance',
  ContractorWorker: 'ContractorWorker',
  ContractorProjectAssignment: 'ContractorProjectAssignment',
  ContractorPerformanceEvaluation: 'ContractorPerformanceEvaluation'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
