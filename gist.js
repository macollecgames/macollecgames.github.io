/**
 * gist.js — Synchronisation GitHub Gist pour Collectioner
 * Inclure dans chaque page : <script src="gist.js"></script>
 *
 * CORRECTIONS :
 * - Debounce sur saveToGist (évite les requêtes multiples rapides)
 * - Protection contre l'écrasement du localStorage par un Gist vide
 * - File d'attente pour éviter les requêtes concurrentes
 */

const GIST_KEYS = {
    vinylCollection:       'vinyls',
    cdCollection:          'cds',
    dvdCollection:         'dvds',
    consoleCollection:     'consoles',
    jeuxCollection:        'jeux',
    accessoireCollection:  'accessoires'
};

/**
 * Lit tout le Gist et met à jour le localStorage.
 * Appelé au chargement de chaque page.
 * PROTECTION : n'écrase pas le localStorage si le Gist retourne des données vides.
 */
async function loadFromGist() {
    const gistId = localStorage.getItem('gistId');
    const token  = localStorage.getItem('githubToken');
    if (!gistId || !token) return;
    try {
        const r = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const gist = await r.json();
        const file = gist.files['collection.json'];
        if (!file) return;
        const data = JSON.parse(file.content);

        // PROTECTION : on n'écrase que si le Gist contient vraiment des données
        // ou si le localStorage est vide (premier chargement)
        Object.entries(GIST_KEYS).forEach(([lsKey, gistKey]) => {
            if (!Array.isArray(data[gistKey])) return;
            const gistHasData = data[gistKey].length > 0;
            const localRaw = localStorage.getItem(lsKey);
            let localHasData = false;
            try {
                localHasData = JSON.parse(localRaw || '[]').length > 0;
            } catch {}

            // N'écrase le local que si :
            // - le Gist a des données, OU
            // - le local est vide (initialisation)
            if (gistHasData || !localHasData) {
                localStorage.setItem(lsKey, JSON.stringify(data[gistKey]));
            }
        });
    } catch(e) {
        console.warn('Gist load error:', e.message);
    }
}

/**
 * Debounce + file d'attente pour saveToGist.
 * Évite les requêtes multiples si plusieurs saves rapides.
 */
let _gistSaveTimer = null;
let _gistSavePending = false;

async function saveToGist() {
    const gistId = localStorage.getItem('gistId');
    const token  = localStorage.getItem('githubToken');
    if (!gistId || !token) return;

    // Debounce : attend 800ms après le dernier appel
    clearTimeout(_gistSaveTimer);
    _gistSaveTimer = setTimeout(async () => {
        if (_gistSavePending) return; // requête déjà en cours
        _gistSavePending = true;
        try {
            const data = {};
            Object.entries(GIST_KEYS).forEach(([lsKey, gistKey]) => {
                try { data[gistKey] = JSON.parse(localStorage.getItem(lsKey) || '[]'); }
                catch { data[gistKey] = []; }
            });
            const r = await fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'collection.json': {
                            content: JSON.stringify(data, null, 2)
                        }
                    }
                })
            });
            if (!r.ok) throw new Error('HTTP ' + r.status);
        } catch(e) {
            console.warn('Gist save error:', e.message);
        } finally {
            _gistSavePending = false;
        }
    }, 800);
}
