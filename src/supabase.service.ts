import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';

@Injectable()
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;

        if (!url || !key) {
            throw new Error('❌ Variables de entorno SUPABASE_URL o SUPABASE_KEY no definidas.');
        }

        this.supabase = createClient(url, key);
    }

    async uploadImage(fileBuffer: Buffer, fileName: string, mimeType: string) {
        try {
            const newName = `${uuid()}-${fileName}`;
            const bucketName = 'lookapp-images';

            // Subir archivo
            const { error: uploadError } = await this.supabase.storage
                .from(bucketName)
                .upload(newName, fileBuffer, {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                throw new Error(`Error subiendo imagen: ${uploadError.message}`);
            }

            // Obtener URL pública
            const { data: publicData } = this.supabase.storage
                .from(bucketName)
                .getPublicUrl(newName);

            if (!publicData?.publicUrl) {
                throw new Error('No se pudo obtener la URL pública del archivo subido.');
            }

            return publicData.publicUrl;
        } catch (error) {
            console.error('❌ Error en uploadImage:', error);
            throw error;
        }
    }
}
