import { AttachmentService } from "./attachment.service";
import { RequestUser } from "../auth/current-user.decorator";
import { ConfirmAttachmentDto } from "./dto/confirm-attachment.dto";
import { PresignAttachmentDto } from "./dto/presign-attachment.dto";
export declare class AttachmentController {
    private readonly attachmentService;
    constructor(attachmentService: AttachmentService);
    presign(dto: PresignAttachmentDto): Promise<{
        data: import("./attachment.service").PresignAttachmentResult;
    }>;
    confirm(dto: ConfirmAttachmentDto, user: RequestUser): Promise<{
        data: import("./attachment.service").ConfirmAttachmentResult;
    }>;
    download(id: string): Promise<{
        data: {
            downloadUrl: string;
        };
    }>;
}
