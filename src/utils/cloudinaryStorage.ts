import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";

type CloudinaryResourceType = "auto" | "image" | "raw";

type UploadLocalFileOptions = {
  filePath: string;
  folder: string;
  fileName?: string;
  publicId?: string;
  resourceType?: CloudinaryResourceType;
  overwrite?: boolean;
};

type UploadedAsset = {
  publicId: string | null;
  url: string;
  usedCloudinary: boolean;
};

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

const isConfigured = () => Boolean(cloudName && apiKey && apiSecret);

const normalizeFolder = (folder: string) => folder.replace(/^\/+|\/+$/g, "");

const inferMimeType = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
};

const sanitizePublicId = (value: string) =>
  value
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "")
    .slice(0, 120) || `asset-${Date.now()}`;

const buildLocalAssetUrl = (filePath: string) => {
  const relativePath = path.relative(process.cwd(), filePath);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Cannot build a public URL for file outside the workspace: ${filePath}`);
  }

  return `/${relativePath.replace(/\\/g, "/")}`;
};

const buildSignature = (params: Record<string, string>) => {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
};

export const uploadLocalFileToCloudinary = async (
  options: UploadLocalFileOptions
): Promise<UploadedAsset> => {
  const {
    filePath,
    folder,
    fileName = path.basename(filePath),
    publicId = `${sanitizePublicId(fileName)}-${Date.now()}`,
    resourceType = "auto",
    overwrite = true,
  } = options;

  if (!isConfigured()) {
    return {
      publicId: null,
      url: buildLocalAssetUrl(filePath),
      usedCloudinary: false,
    };
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const normalizedFolder = normalizeFolder(folder);
  const signedParams = {
    folder: normalizedFolder,
    overwrite: overwrite ? "true" : "false",
    public_id: sanitizePublicId(publicId),
    timestamp,
  };
  const signature = buildSignature(signedParams);
  const buffer = await fs.promises.readFile(filePath);
  const body = new URLSearchParams();

  body.set("file", `data:${inferMimeType(fileName)};base64,${buffer.toString("base64")}`);
  body.set("api_key", apiKey as string);
  body.set("folder", normalizedFolder);
  body.set("overwrite", signedParams.overwrite);
  body.set("public_id", signedParams.public_id);
  body.set("signature", signature);
  body.set("timestamp", timestamp);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const response = await axios.post(endpoint, body.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return {
    publicId: response.data?.public_id || signedParams.public_id,
    url: response.data?.secure_url || response.data?.url,
    usedCloudinary: true,
  };
};

export const removeLocalFileIfExists = async (filePath?: string | null) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.promises.unlink(filePath);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.warn(`Failed to remove temporary file: ${filePath}`, error);
    }
  }
};
