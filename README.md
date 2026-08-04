# Forgia — diario di allenamento PWA

App web installabile per registrare gli allenamenti in palestra. Funziona
completamente offline, non ha account né server: i dati restano su IndexedDB nel
dispositivo e si esportano in JSON quando si vuole.

```bash
npm install
npm run dev        # sviluppo su http://localhost:5173
npm test           # test unitari della logica
npm run build      # bundle di produzione in dist/
npm run preview    # serve dist/ (necessario per provare il service worker)
```

> Il service worker è attivo solo nella build di produzione: in `dev` è
> disattivato di proposito, altrimenti servirebbe file in cache mentre li stai
> modificando.

## Da dove viene il modello di interazione

Le app che dominano questa categoria (Hevy, Strong) hanno convissuto tutte sullo
stesso schema, e per buone ragioni. Forgia lo adotta:

| Scelta | Perché |
|---|---|
| **Una card per esercizio, una riga per serie** | La sessione si legge tutta a colpo d'occhio. Il form singolo "scegli esercizio → inserisci → salva" costringe a ricordare a memoria cosa hai già fatto. |
| **Colonna `PRECEDENTE` sempre visibile** | È l'informazione più utile mentre ci si allena: sapere che l'ultima volta hai fatto 82,5 × 8 decide il carico di adesso. Toccarla ricopia i valori. |
| **Registrare = un tap sulla spunta** | Carico e ripetizioni sono già pre-compilati con l'ultima volta. Chi ripete lo stesso peso non tocca nulla. |
| **Recupero automatico alla spunta** | Il timer parte da solo col recupero configurato per quell'esercizio, e resta una barra in basso invece di una schermata modale: durante il recupero si continua a usare l'app. |
| **Tipi di serie a lettera (W / D / C)** | Riscaldamento, drop set e cedimento si distinguono con un tocco sul numero, e il riscaldamento resta fuori da volume e record. |
| **Record celebrati sul momento** | Il primato viene rilevato quando spunti la serie, non a fine mese in una schermata di statistiche. |

## Struttura

```
src/
  core/          logica pura, senza DOM — è la parte coperta dai test
    metrics.js     1RM, volumi, record, prestazione precedente, progressi
    workout.js     modello della sessione (immutabile)
    plates.js      calcolo dischi
    restTimer.js   timer basato su timestamp assoluti
    db.js          IndexedDB promisificato, con fallback in memoria
    store.js       stato applicativo + persistenza
    feedback.js    audio, vibrazione, wake lock
    format.js      formattazioni italiane
  data/          libreria esercizi e routine di partenza
  ui/            viste e componenti (hyperscript, niente innerHTML)
  pwa.js         service worker e prompt di installazione
public/          manifest, service worker, icone
```

## Decisioni tecniche non ovvie

- **Nessuna dipendenza a runtime.** Niente framework, niente font da CDN. Il
  bundle sta in ~26 kB gzip e l'app si apre istantaneamente anche con la rete
  del seminterrato di una palestra.
- **Il timer di recupero usa timestamp assoluti**, non un contatore decrementato
  a ogni tick. Quando il telefono va in standby i timer vengono congelati: un
  contatore a decremento sbaglierebbe di minuti.
- **La sessione in corso è salvata a ogni modifica** (con debounce) e di nuovo
  quando l'app passa in background. Chiudere l'app o restare senza batteria non
  fa perdere l'allenamento.
- **Il DOM si costruisce con nodi reali**, mai con `innerHTML`: i nomi che
  scrive l'utente (esercizi personalizzati, note, routine) non possono
  trasformarsi in markup.
- **`overscroll-behavior: none`** impedisce che il pull-to-refresh ricarichi
  l'app a metà serie.
- **Le righe completate hanno sfondo opaco**, non semitrasparente: sotto c'è il
  livello rosso dello swipe-per-eliminare.
- **I pannelli aggiungono una voce di cronologia**, così il tasto "indietro" di
  Android li chiude invece di uscire dall'app.

## Dati

Tutto in IndexedDB (`forgia`): allenamenti, routine, record, esercizi
personalizzati, preferenze e sessione in corso. `Strumenti → I tuoi dati`
esporta e reimporta un JSON completo. L'import unisce senza duplicare (chiave
sull'id dell'allenamento) e ricalcola i record da zero.

## Test

`npm test` copre la logica pura: stima dell'1RM, conteggi di volume con
esclusione del riscaldamento, rilevamento dei record, ricostruzione dei record
dallo storico, indice della prestazione precedente, calcolo dischi (compresi i
pesi non componibili e gli errori di virgola mobile) e le mutazioni immutabili
della sessione.
