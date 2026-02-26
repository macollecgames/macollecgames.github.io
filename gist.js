/**
 * gist.js — Synchronisation GitHub Gist pour Collectioner
 * Inclure dans chaque page : <script src="gist.js"></script>
 */

const GIST_KEYS = {
    vinylCollection: 'vinyls',
    cdCollection:    'cds',
    dvdCollection:   'dvds',
    consoleCollection: 'consoles',
    jeuxCollection:  'jeux'
};

/**
 * Lit tout le Gist et met à jour le localStorage.
 * Appelé au chargement de chaque page.
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
        Object.entries(GIST_KEYS).forEach(([lsKey, gistKey]) => {
            if (Array.isArray(data[gistKey])) {
                localStorage.setItem(lsKey, JSON.stringify(data[gistKey]));
            }
        });
    } catch(e) {
        console.warn('Gist load error:', e.message);
    }
}

/**
 * Écrit toute la collection dans le Gist.
 * Appelé automatiquement après chaque saveUser().
 */
async function saveToGist() {
    const gistId = localStorage.getItem('gistId');
    const token  = localStorage.getItem('githubToken');
    if (!gistId || !token) return;
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
    }
}
