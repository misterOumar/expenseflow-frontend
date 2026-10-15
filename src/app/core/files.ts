import { HttpResponse } from '@angular/common/http';

/**
 * Les fichiers de l'API exigent le jeton JWT : ils sont récupérés par HttpClient puis proposés
 * au téléchargement, un simple lien ne pouvant pas porter l'en-tête Authorization.
 */
export function saveDownload(response: HttpResponse<Blob>, fallbackName: string): void {
  if (!response.body) {
    return;
  }
  const url = URL.createObjectURL(response.body);
  const link = document.createElement('a');
  link.href = url;
  link.download = filenameFrom(response.headers.get('Content-Disposition')) ?? fallbackName;
  link.click();
  URL.revokeObjectURL(url);
}

function filenameFrom(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (encoded) {
    return decodeURIComponent(encoded[1]);
  }
  return /filename="?([^";]+)"?/i.exec(contentDisposition)?.[1] ?? null;
}
