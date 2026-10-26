import { HttpException, HttpStatus } from "@nestjs/common";

export function encodeIdeaCursor(created: Date, id: string): string {
  return Buffer.from(`${created.toISOString()}|${id}`, "utf8").toString("base64url");
}

export function decodeIdeaCursor(cursor: string): { created: Date; id: string } {
  if (typeof cursor !== "string" || cursor.length === 0 || cursor.length > 200) {
    throw new HttpException("Invalid cursor", HttpStatus.BAD_REQUEST);
  }

  const text = Buffer.from(cursor, "base64url").toString("utf8");
  const splitAt = text.lastIndexOf("|");
  if (splitAt <= 0) {
    throw new HttpException("Invalid cursor", HttpStatus.BAD_REQUEST);
  }

  const created = new Date(text.slice(0, splitAt));
  const id = text.slice(splitAt + 1);
  if (Number.isNaN(created.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new HttpException("Invalid cursor", HttpStatus.BAD_REQUEST);
  }

  return { created, id };
}

export function parsePageLimit(limit: unknown): number {
  if (limit === undefined || limit === null || limit === "") {
    return 25;
  }

  if (typeof limit === "string" && !/^-?\d+$/.test(limit)) {
    throw new HttpException("limit must be an integer from 1 to 100", HttpStatus.BAD_REQUEST);
  }

  const parsed = typeof limit === "number" ? limit : Number(limit);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new HttpException("limit must be an integer from 1 to 100", HttpStatus.BAD_REQUEST);
  }

  return parsed;
}
