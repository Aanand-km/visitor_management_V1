const db = require('../db/db');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

function getPublicIdFromUrl(url) {
    if (!url) return null;
    const splitKey = url.includes('/authenticated/') ? '/authenticated/' : '/upload/';
    const parts = url.split(splitKey);
    if (parts.length < 2) return null;

    let pathSegments = parts[1].split('/');
    pathSegments = pathSegments.filter(segment => {
        if (segment.startsWith('s--')) return false;
        if (/^v\d+$/.test(segment)) return false;
        return true;
    });

    const publicIdWithFormat = pathSegments.join('/');
    const lastDot = publicIdWithFormat.lastIndexOf('.');
    return lastDot !== -1 ? publicIdWithFormat.substring(0, lastDot) : publicIdWithFormat;
}

function getResourceTypeFromUrl(url) {
    if (!url) return 'image';
    const match = url.match(/res\.cloudinary\.com\/[^/]+\/([^/]+)/);
    return match ? match[1] : 'image';
}

async function purgeOldVisitorRecords() {
    const retentionDays = parseInt(process.env.RETENTION_DAYS) || 30;
    console.log(`[RETENTION] Running auto-purge check for records older than ${retentionDays} days...`);

    const findSql = `
        SELECT id, name, photo_path, document_path 
        FROM visitors 
        WHERE created_at < NOW() - INTERVAL ? DAY
    `;

    db.query(findSql, [retentionDays], async (err, rows) => {
        if (err) {
            console.error('[RETENTION] Error finding old visitor records:', err);
            return;
        }

        if (rows.length === 0) {
            console.log('[RETENTION] No old records to purge.');
            return;
        }

        console.log(`[RETENTION] Found ${rows.length} old records to purge.`);

        for (const visitor of rows) {
            console.log(`[RETENTION] Purging visitor ID ${visitor.id} (${visitor.name})...`);

            // 1. Delete Photo from Cloudinary
            if (visitor.photo_path && visitor.photo_path.startsWith('http')) {
                const publicId = getPublicIdFromUrl(visitor.photo_path);
                const resourceType = getResourceTypeFromUrl(visitor.photo_path);
                const deliveryType = visitor.photo_path.includes('/authenticated/') ? 'authenticated' : 'upload';
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: deliveryType });
                        console.log(`[RETENTION] Successfully deleted Cloudinary photo for visitor ${visitor.id}`);
                    } catch (cloudErr) {
                        console.error(`[RETENTION] Failed to delete Cloudinary photo for visitor ${visitor.id}:`, cloudErr.message);
                    }
                }
            }

            // 2. Delete Document from Cloudinary
            if (visitor.document_path && visitor.document_path.startsWith('http')) {
                const publicId = getPublicIdFromUrl(visitor.document_path);
                const resourceType = getResourceTypeFromUrl(visitor.document_path);
                const deliveryType = visitor.document_path.includes('/authenticated/') ? 'authenticated' : 'upload';
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: deliveryType });
                        console.log(`[RETENTION] Successfully deleted Cloudinary document for visitor ${visitor.id}`);
                    } catch (cloudErr) {
                        console.error(`[RETENTION] Failed to delete Cloudinary document for visitor ${visitor.id}:`, cloudErr.message);
                    }
                }
            }

            // 3. Delete Visitor Record from Database
            db.query('DELETE FROM visitors WHERE id = ?', [visitor.id], (delErr) => {
                if (delErr) {
                    console.error(`[RETENTION] Database error deleting visitor ${visitor.id}:`, delErr);
                } else {
                    console.log(`[RETENTION] Database record deleted for visitor ${visitor.id}`);
                }
            });
        }
    });
}

module.exports = {
    purgeOldVisitorRecords
};
