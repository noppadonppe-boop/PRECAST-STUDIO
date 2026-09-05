import { sourceFileSchema } from '@precast/schemas';

type SourceFileMetadata = Pick<File, 'name' | 'type' | 'size'>;

export function canonicalSourceContentType(file: SourceFileMetadata): string {
  const contentType = file.type.trim().toLowerCase();
  const isIfc = file.name.toLowerCase().endsWith('.ifc');
  if (isIfc && (contentType === '' || contentType === 'application/octet-stream')) return 'application/x-step';
  return contentType;
}

export function validateSourceFile(file: SourceFileMetadata): string[] {
  const result = sourceFileSchema.safeParse({
    name: file.name,
    contentType: canonicalSourceContentType(file),
    size: file.size,
  });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}
