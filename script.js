moment.locale('fr');
const dateFormat = new Map()
const selectedCollection = document.querySelector("#collection")
dateFormat.set("slash", "DD/MM/YYYY")
dateFormat.set("tiret", "YYYY-MM-DD")
let table = null
const listePostes = document.getElementById('liste_postes')
const tableColumnsParams = [
    { title: "Référence", field: "reference", sorter: "alphanum", headerFilter: true, print: true, titlePrint: "Réf.", headerFilter: true },
    { title: "Index", field: "index", sorter: "string", visible: true, print: true, download: true },
    { title: "Titre", field: "titre", sorter: "string", headerFilter: true, print: true, widthGrow: 6 },
    { title: "Version", field: "version", sorter: "number", hozAlign: "center", print: true, widthShrink: 1 },
    {
        title: "Dates",
        columns: [
            {
                title: "Version", field: "date_version", hozAlign: "center", formatter: dateFormatter, sorter: ((a, b, aRow, bRow, column, dir, sorterParams) => a - b), print: true
            },
            {
                title: "Edition", field: "date_edition", hozAlign: "center", formatter: dateFormatter, sorter: ((a, b, aRow, bRow, column, dir, sorterParams) => a - b), print: true
            },
            {
                title: "Application", field: "date_application", hozAlign: "center", formatter: dateFormatter, sorter: ((a, b, aRow, bRow, column, dir, sorterParams) => a - b), print: true
            }
        ]
    },
    { title: "Pointage", field: "okReception", hozAlign: "center", editor: true, formatter: "tickCross", download: true, print: false },
    {
        title: "Classeur", editor: "textarea", field: "classeur", download: true, print: true, editableTitle: false, editorParams: {
            verticalNavigation: "editor"
        }
    }
]
const i18nFR = {
    "fr": {
        "columns": {
            "nom": "Nom",
        },
        "ajax": {
            "loading": "Chargement",
            "error": "Erreur",
        },
        "groups": {
            "item": "document",
            "items": "documents",
        },
        "pagination": {
            "page_size": "Taille de page",
            "page_title": "Voir Page",
            "first": "Première",
            "first_title": "Première Page",
            "last": "Dernière",
            "last_title": "Dernière Page",
            "prev": "Préc.",
            "prev_title": "Page Préc.",
            "next": "Suivant",
            "next_title": "Page Suiv.",
            "all": "Tout",
        },
        "headerFilters": {
            "default": "filtrer par colonne",
            "columns": {
                "name": "filtrer par nom",
            }
        }
    }
}
const lancer = document.querySelector('#valider')
const db = new Dexie("textes_prescription")
const planClassement = {
    "AG": "Affaires générales",
    "AG+AS": "Approvisionnement et stocks, Marchés et Achats",
    "CL": "Commercial",
    "EF": "Equipements fixes",
    "FC": "Finances et comptabilité",
    "MG": "Matériel et outillage",
    "MR": "Matériel roulant",
    "OG": "Organisation et gestion",
    "PS": "Personnel et questions sociales",
    "S": "Sécurité de la circulation",
    "TR": "Trafic et Exploitation"
}
document.getElementById('impression').addEventListener('click', (e) => {
    e.preventDefault()
    table.setGroupBy([(data) => Texte.getClassement(data.index, 1, true), (data) => Texte.getClassement(data.index, 2)])
    table.print(true, true)
    table.setGroupBy([(data) => Texte.getClassement(data.index, 1, true), (data) => Texte.getClassement(data.index, 3)])
})
document.getElementById('impression-par-classeur').addEventListener('click', (e) => {
    e.preventDefault()
    table.setGroupBy([(data) => data.classeur == '' || data.classeur == null ? `Hors classeur` : `Classeur ${data.classeur}`, (data) => Texte.getClassement(data.index, 2)])
    table.print(true, true)
    table.setGroupBy([(data) => Texte.getClassement(data.index, 1, true), (data) => Texte.getClassement(data.index, 3)])
})
document.getElementById('impression-selection').addEventListener('click', (e) => {
    e.preventDefault()
    table.print("selected", false, false)
})
document.getElementById('telecharger').addEventListener('click', (e) => {
    e.preventDefault()
    table.setGroupBy()
    table.download("xlsx", "data.xlsx", { sheetName: "MyData" })
    table.setGroupBy([(data) => Texte.getClassement(data.index, 1, true), (data) => Texte.getClassement(data.index, 3)])
})
class Texte {
    constructor (texte) {
        this.reference = texte["Référence"]
        this.ref_precedente = texte["Référence précédente"]
        this.date_chgt = this.getDateFormatted(texte["Date du changement"])
        this.ancienne_reference = texte["Ancienne référence"]
        this.index = texte["Index utilisateur"]
        this.titre = texte["Titre"]
        this.nature = texte["Nature"]
        this.emetteur = texte["Émetteur"]
        this.contact = texte["Contact"]
        this.precision_emetteur = texte["Précision émetteur"]
        this.securite = texte["SEF et/ou SST"]
        this.date_edition = this.getDateFormatted(texte["Date d'édition"])
        this.version = texte["Version"]
        this.rectif_abrogatoire = texte["Rectificatif abrogatoire"] === "Oui" ? true : false
        this.date_version = this.getDateFormatted(texte["Date version"])
        this.etat = texte["Etat"]
        this.date_application = this.getDateFormatted(texte["Date d'application"])
        this.quantite_papier = texte["Qté papier distribuée"]
        this.quantite_intranet = texte["Qté Intranet distribuée"]
        this.media = texte["Media distribué"]
        this.date_der_enreg_distri = this.getDateFormatted(texte["Date dernier enreg. de distribution"])
        this.date_enreg_reception_ua = this.getDateFormatted(texte["Date enreg. qté reçue dans l'Ua"])
        this.date_ar_gdoc = this.getDateFormatted(texte["Date AR par le Gdoc"])
        this.date_ar_rco = this.getDateFormatted(texte["Date AR pour la collection"])
        this.signataire = texte["Signataire"]
        this.lien = texte["Lien vers le texte actuel"]
        this.commentaires = ""
        this.okReception = true
        this.classeur = null
    }
    estApplicable() {
        return this.etat === "Vigueur" && this.rectif_abrogatoire === false
    }
    async getClasseur() {
        this.classeur = await db.relations.where("collection").equals(selectedCollection.value).first().classeur
    }
    static async updateClasseur(id, classeur) {
        await db.relations.where("texteId").equals(id).and(rel => rel.collection === selectedCollection.value).modify(rel => rel.classeur = classeur)
    }
    getEtat() {
        return this.estApplicable ? this.etat : this.rectif_abrogatoire === true ? "Abrogé" : this.etat
    }
    static getClassement(index, position = 2, pdc = false) {
        const elem = index.split(' ', position).join(' ')
        if (pdc === true) {
            return `${planClassement[elem]} (${elem})`
        }
        return elem
    }
    getDateFormatted(date) {
        if (!date || date === null) {
            return null
        }
        const re = date.includes("/") ? moment(date, dateFormat.get("slash")) : moment(date, dateFormat.get("tiret"))
        return re.toDate()
    }
}
function dateFormatter(cell, formatterParams, onRendered) {
    if (!cell.getValue()) { return "" }
    const date = moment(cell.getValue())
    if (!date.isValid()) {
        console.log(cell.getValue())
        return "Dès réception"
    }
    return date.format(document.getElementById("date_format").value)
}

function getHeader() {
    return `<h1 class="ui header">${document.querySelector('#type_doc option:checked').textContent}<div class="sub header">Collection ${document.querySelector('#collection').value}</div></h1>`
}
function getFooter() {
    const date = new Date()
    return `<h4>${document.querySelector('#type_doc option:checked').textContent} généré le ${date.toLocaleDateString()} à ${date.toLocaleTimeString()}</h4>`
}
async function ChargementTableau() {
    const collections = await db.relations.where("collection").equals(selectedCollection.value).toArray()
    let elems = await Promise.all(collections.map(async collection => {
        const doc = await db.textes.get(collection.texteId)
        doc.classeur = collection.classeur
        return doc
    }))
    if (document.querySelector("#vigueur-uniquement").checked === true) {
        elems = elems.filter(texte => texte.etat === "Vigueur" && texte.rectif_abrogatoire === false)
    }
    revelerTableau()
    table = new Tabulator("#table", {
        groupBy: [(data) => Texte.getClassement(data.index, 1, true), (data) => Texte.getClassement(data.index, 3)],
        reactiveData: true,
        data: elems,
        cellEdited: function (row) {
            const data = row.getData()
            // db.textes.put(data)
            if (row.getField() === "classeur") {
                Texte.updateClasseur(data.id, row.getValue())
            }
        },
        columns: tableColumnsParams,
        placeholder: "Aucun élément disponible",
        pagination: "local",
        initialSort: [
            { column: "index", dir: "asc" }
        ],
        // movableRows: true,
        movableColumns: true,
        paginationSize: true,
        paginationSizeSelector: [25, 50, 100, 250, true],
        printAsHtml: false,
        printHeader: getHeader(),
        printFooter: getFooter(),
        layout: "fitColumns",
        printStyled: true,
        selectable: true,
        tabEndNewRow: true,
        selectablePersistence: true,
        locale: true,
        langs: i18nFR
    });
}
db.version(1).stores({
    textes: "++id,&[reference+version+date_version]",
    collections: "&titre",
    relations: "++, texteId, collection",
    log: "++id, date"
})
const collections = ["ACRI", "ASFP AUXERRE", "ASMTE UO AUXERRE", "Assistant Gestion des Capacités Laroche", "Assistant Gestion des Capacités Melun", "AUXERRE BV", "AUXERRE POSTE 2", "AVALLON BV", "BERCY poste 1", "BERCY Poste 2", "BERCY Poste 3", "BOURRON", "BUREAU TRAVAUX POLE PRODUCTION", "CHATEL CENSOIR", "CHATILLON", "CHEMILLY APPOIGNY", "CLAMECY BV", "CLAMECY POSTE 2", "Collection suivi MGOC 2.0", "COMBS-LA-VILLE Poste 1 (PRS)", "Consultant SYSPRE", "Coordonateur Régional", "CORBEIL-ESSONNE Poste 1 (PRS)", "CPS UO AUXERRE", "CPS UO Melun", "CPS UO PARIS", "CRAVANT BAZARNES ACBV", "Dirigeant BHL", "DPX CIRCULATION AUXERRE", "DPX CIRCULATION BERCY Poste 1 et Poste 2", "DPX CIRCULATION BERCY POSTE 3, GSB ET Graisseurs", "DPX CIRCULATION COMBS", "DPX CIRCULATION CORBEIL", "DPX CIRCULATION MALESHERBES", "DPX CIRCULATION MELUN", "DPX CIRCULATION MONTARGIS", "DPX CIRCULATION MONTEREAU", "DPX CIRCULATION MORET", "DPX CIRCULATION MORVAN", "DPX CIRCULATION POSTE 4", "DPX CIRCULATION TONNERRE", "DPX CIRCULATION Valenton VS", "DPX CIRCULATION VILLENEUVE Triage Nord", "DPX CIRCULATION VILLENEUVE Triage Sud", "DPX LAROCHE/SENS CIRCULATION COLLECTION COMMUNE", "DPX VALENTON", "DRC", "Gedoc DCF", "Gedoc DCF EER", "Gedoc DFSR", "Gedoc DSEM PSE", "Gedoc ECT PSE", "Gedoc EIC Auvergne Nivernais", "Gedoc EIC Bourgogne Franche Comté", "Gedoc EIC PRG", "Gedoc ESBE", "Gedoc EST DR", "Gedoc ESV BFC", "Gedoc ESV Paris Nord", "Gedoc ESV TGV PSE", "Gedoc ETP PSE", "Gedoc Infrapôle LGV PSE", "Gedoc INFRAPOLE PSE", "Gedoc ITIF", "Gedoc Pôle Ingénierie Sud Paris", "Gedoc SFERIS", "Gedoc TSEE", "GIEN", "GRAISSEURS BERCY", "Graisseurs Laroche", "GRAISSEURS VIP", "HERICY", "ITIREMIA SERVICE UA ILE DE FRANCE", "LA FERTE ALAIS", "LAROCHE POSTE 1", "LAROCHE POSTE 2", "LAROCHE POSTE 4", "LAROCHE POSTE 5", "LEZINNES", "LGV Cellule Travaux", "LGV PAR Collection Commune - PAR Sud Est", "LGV PAR Ile De France", "MALESHERBES /AC", "MELUN (PAI)", "MONETEAU", "MONTARGIS", "MONTEREAU Poste Unique (PRA)", "MORET Poste 1 (PRG-PRCI-leviers)", "NEMOURS /AC", "NOGENT/VERNISSON ( BUNGALOW )", "Outil ODICEO", "PARIS PRS GSB", "PC Travaux AHT", "PCD PARIS LYON", "POLE DEVELOPPEMENT ET EXPLOITABILITE DU RESEAU", "POLE OGEF", "POLE RH ASSISTANTE RESPONSABLE GA", "POLE RH COFO", "POLE RH RDCF", "POLE RH RESPONSABLE RESSOURCES HUMAINES", "POLE RH RESPONSABLE RS", "POLE SECURITE", "Poste V (PIVOS) Valenton", "PRS 10 LIEUSAINT", "PRS 11 CHATELET", "PRS 12 MAROLLES", "PRS DE VALENTON", "Régulateur Table 1", "Régulateur Table 2", "Régulateur Table 3", "RIS", "SACOCHE ASTREINTE INFRA YONNE NORD", "SACOCHE ASTREINTE INFRA YONNE SUD", "Sacoche astreinte Melun", "Sacoche Desserte Clamecy", "Sacoche Desserte Malesherbes", "Sacoche Desserte Montargis", "SAINT FLORENTIN BV", "SAINT FLORENTIN PRS 15", "SENS POSTE 1", "SENS POSTE 2", "SENS PRS 13 CUY", "SENS PRS 14 VAUMORT", "SERMIZELLES", "Société Gardiennage (via Pôle Développement)", "SUCY POSTE 1", "SUPERVISEUR TRAVAUX", "TONNERRE BV", "TONNERRE PRS 16", "UO AUXERRE", "UO MELUN / ASMTE UO MELUN", "UO PRODUCTION PARIS - DPX LGV - DPX REGULATION", "UO PVV-ASFP PARIS-ASFP VILLENEUVE VALENTON-DPX PCD", "Valenton Poste T", "VERNOU / AC", "VILLENEUVE PEI/PMV poste R", "VILLENEUVE POSTE 2", "VILLENEUVE POSTE 3", "VILLENEUVE POSTE 4", "VILLENEUVE POSTE A", "VILLENEUVE POSTE B", "VILLENEUVE PRAIRIE Poste J", "VILLENEUVE PRAIRIE Poste K"]
async function c() {
    collections.forEach(async el => await db.collections.put({ titre: el }))

    db.collections.toArray().then(colls => {
        colls.forEach(coll => {
            const el = document.createElement('option')
            el.innerText = coll.titre
            el.value = coll.titre
            document.querySelector("#collection").appendChild(el)
        })
    })
}
c()

document.querySelector("#inventaire").addEventListener("change", (e) => {
    e.preventDefault()

    const reader = new FileReader()
    const inventaire = document.querySelector('#inventaire')

    reader.readAsText(inventaire.files[0], 'Windows-1252')
    db.textes.mapToClass(Texte)

    reader.onload = function () {
        Papa.parse(reader.result, {
            header: true,
            dynamicTyping: true,
            complete: async function (results) {
                await results.data.forEach(async result => {
                    const ref = result.Référence
                    if (ref !== null) {
                        let t = new Texte(result)
                        db.textes.put(t)
                        db.textes.where("[reference+version+date_version]").equals([t.reference, t.version, t.date_version]).first().then(async texte => {
                            const rel = await db.relations
                                .where("texteId")
                                .equals(texte.id)
                                .and(d => d.collection === selectedCollection.value)
                                .first()
                            if (!rel) {
                                db.relations.put({
                                    texteId: texte.id,
                                    collection: selectedCollection.value
                                })
                            }
                        })
                    }
                })
                nettoyerDb(results.data)
            }
        })
    }

    reader.onerror = function () {
        console.log(reader.error);
    };
})

lancer.addEventListener('click', (e) => {
    e.preventDefault()
    db.log.put({ date: new Date(), collection: selectedCollection.value })
    afficherPostesEnregistres()
    ChargementTableau()
})
selectedCollection.addEventListener("change", async (e) => {
    e.preventDefault()
    const coll = await db.relations.where("collection").equals(selectedCollection.value).count()
    if (coll > 0) {
        document.querySelector("#charger").disabled = false
    } else {
        document.querySelector("#charger").disabled = true
    }
    db.log.filter(c => c.collection === selectedCollection.value).last().then(doc => {
        document.getElementById("last-inventaire").value = moment(doc.date).format("YYYY-MM-DD")
    })
})
document.querySelector("#charger").addEventListener("click", (e) => {
    e.preventDefault()
    afficherPostesEnregistres()
    ChargementTableau()
})
function revelerTableau() {
    document.getElementById('form-tableau').hidden = true
    document.getElementById('tableau-content').style.visibility = "visible"
}
async function nettoyerDb(values) {
    const refs = values.map(t => t.Référence).filter(t => t !== null)
    const colls = await db.relations.where("collection").equals(selectedCollection.value).toArray()
    if (refs.length !== colls.length) {
        console.info('Des textes ont été supprimé de la collection')
    }
    colls.forEach(async coll => {
        db.textes.get(coll.texteId).then(doc => {
            const elem = refs.find(e => e === doc.reference)
            if (!elem) {
                db.relations.where(coll).delete()
            }
        })
    })
}
async function afficherPostesEnregistres() {
    const coll = new Map()
    await db.relations.each(col => coll.set(col.collection, col.collection))
    if (coll.size === 0) {
        listePostes.classList.add('disabled')
        return
    } else {
        masquerAvertissement()
    }
    coll.forEach(poste => {
        const opt = document.createElement('option')
        opt.value = poste
        opt.innerText = poste
        if (selectedCollection.value === poste) {
            listePostes.value = poste
            opt.selected = true
        }
        listePostes.appendChild(opt)
    })
    listePostes.addEventListener('change', (e) => {
        if (listePostes.value === selectedCollection.value) {
            return
        } else {
            selectedCollection.value = listePostes.value
            ChargementTableau()
        }

    })
}
function masquerAvertissement() {
    document.getElementById("avertissement").classList.add("hidden")
}
async function verifConnexion() {
    const coll = new Map()
    await db.relations.each(col => coll.set(col.collection, col.collection))
    if (coll.size === 0) {
        listePostes.classList.add('disabled')
        return
    } else {
        masquerAvertissement()
    }
}
verifConnexion()