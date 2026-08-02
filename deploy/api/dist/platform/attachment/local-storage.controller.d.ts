import type { Request, Response } from "express";
import { ObjectStorageService } from "./object-storage.service";
export declare class LocalStorageController {
    private readonly storage;
    constructor(storage: ObjectStorageService);
    private requireSecret;
    upload(token: string, req: Request, res: Response): Promise<void>;
    download(token: string, res: Response): Promise<void>;
}
