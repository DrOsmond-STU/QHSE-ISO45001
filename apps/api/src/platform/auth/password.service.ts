import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

// Argon2id — dipilih dari opsi "Argon2/bcrypt" PRD Modul 02 §11 sebagai
// default lebih modern.
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
