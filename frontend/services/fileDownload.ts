import { API_CONFIG } from '@/constants/config';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * File Download Service
 * Handles downloading and storing files in the Kooberit registry (public Downloads folder)
 */
class FileDownloadService {
    private destination: Directory;

    constructor() {
        this.destination = new Directory(Paths.document, 'kooberit');

        if (!this.destination.exists) this.destination.create();
    }

    async fileExists(filename: string): Promise<boolean> {
        try {
            // For files in documentDirectory (iOS non-media files)
            const filePath = new File(this.destination.uri, filename);
            
            return filePath.exists;
        } catch {
            return false;
        }
    }

    // Save any file to downloads
    async saveToDownloads(url: string, fileName: string): Promise<string> {
        try {
            // Remove /api from BASE_URL to get the site URL
            const baseUrl = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
            const source = baseUrl + url;

            const file = new File(this.destination.uri, fileName);

            if (!file.exists) {
                const output = await File.downloadFileAsync(source, this.destination);
                
                return output.uri;
            }

            return file.uri;
        } catch (error) {
            throw error;
        }
    };

    async sharingFile(filename: string): Promise<void> {
        try {
            
            const file = new File(this.destination.uri, filename);

            console.log(file)
            
            if (!file.exists) {
                throw new Error('File not found');
            }

            const isAvailable = await Sharing.isAvailableAsync();

            if (isAvailable) {
                Sharing.shareAsync(
                    file.uri, {
                        UTI: this.getUTI(filename),
                        mimeType: file.type,
                        dialogTitle: `Save ${filename}`,
                    }
                )
            } else {
                throw new Error('')
            }
        } catch (error) {
            throw error;
        }
    };

    /**
     * Get iOS Uniform Type Identifier (UTI) from filename
     */
    private getUTI(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        const utiMap: Record<string, string> = {
        'jpg': 'public.jpeg',
        'jpeg': 'public.jpeg',
        'png': 'public.png',
        'gif': 'public.gif',
        'pdf': 'com.adobe.pdf',
        'doc': 'com.microsoft.word.doc',
        'docx': 'org.openxmlformats.wordprocessingml.document',
        'mp4': 'public.mpeg-4',
        'mov': 'com.apple.quicktime-movie',
        'avi': 'public.avi',
        'mkv': 'public.mkv',
        'webm': 'org.webmproject.webm',
        };
        return utiMap[ext || ''] || 'public.data';
    }
}

export default new FileDownloadService();

