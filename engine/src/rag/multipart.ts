// Minimal multipart/form-data parser using byte-level buffer operations.
// Good for <20MB files (holds whole request in memory). No external deps.
//
// Strategy: work entirely with Buffer indexOf so we don't lose binary data
// to Latin-1 string round-tripping. Split on `\r\n--{boundary}`, skip the
// preamble (if any) and the closing `--` marker.

import type http from "http";

export interface ParsedFile {
  fieldName: string;
  filename: string;
  contentType: string;
  data: Buffer;
}

export interface ParsedMultipart {
  fields: Record<string, string>;
  files: ParsedFile[];
}

export async function parseMultipart(
  req: http.IncomingMessage,
  contentType: string,
): Promise<ParsedMultipart> {
  const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/i);
  if (!boundaryMatch) throw new Error("Missing multipart boundary");
  const boundary = boundaryMatch[1]!;
  const body = await readAllBytes(req);

  // Full delimiter per RFC 7578: CRLF + "--" + boundary
  // First boundary in the body may not have a leading CRLF, so handle both.
  const delim = Buffer.from(`\r\n--${boundary}`);
  const firstDelim = Buffer.from(`--${boundary}`);

  // Locate the first boundary (preamble before it is discarded)
  let start = body.indexOf(firstDelim);
  if (start < 0) {
    const preview = body.subarray(0, Math.min(200, body.length)).toString("utf-8")
      .replace(/[\x00-\x08\x0e-\x1f\x7f-\xff]/g, "·");
    const hex = Array.from(body.subarray(0, Math.min(24, body.length)))
      .map((b) => b.toString(16).padStart(2, "0")).join(" ");
    throw new Error(
      `Multipart: no opening boundary found. ` +
      `Expected "${firstDelim.toString("utf-8")}" (${firstDelim.length}b). ` +
      `Got ${body.length}b, hex: ${hex}. Preview: ${preview}`,
    );
  }
  // Move past the boundary line to the first header byte
  start += firstDelim.length;

  const fields: Record<string, string> = {};
  const files: ParsedFile[] = [];

  while (start < body.length) {
    // The next two bytes after a boundary are either "\r\n" (more parts)
    // or "--" (end of multipart body).
    if (body[start] === 0x2d && body[start + 1] === 0x2d) break; // "--"
    if (body[start] === 0x0d && body[start + 1] === 0x0a) start += 2;

    // Find the next boundary (`\r\n--{boundary}`)
    const end = body.indexOf(delim, start);
    if (end < 0) break;

    const partBuf = body.subarray(start, end);
    // Headers are separated from body by \r\n\r\n
    const sep = partBuf.indexOf("\r\n\r\n");
    if (sep < 0) {
      start = end + delim.length;
      continue;
    }
    const headers = partBuf.subarray(0, sep).toString("utf-8");
    const data = partBuf.subarray(sep + 4);

    const nameMatch = headers.match(/name="([^"]+)"/i);
    const filenameMatch = headers.match(/filename="([^"]*)"/i);
    const ctMatch = headers.match(/Content-Type:\s*([^\r\n;]+)/i);
    if (nameMatch) {
      const name = nameMatch[1]!;
      if (filenameMatch && filenameMatch[1]) {
        files.push({
          fieldName: name,
          filename: filenameMatch[1],
          contentType: ctMatch?.[1]?.trim() || "application/octet-stream",
          data: Buffer.from(data), // copy off the big buffer so GC can reclaim it
        });
      } else {
        fields[name] = data.toString("utf-8");
      }
    }

    start = end + delim.length;
  }

  return { fields, files };
}

function readAllBytes(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
