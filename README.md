# Fama-Gestion

Application web de gestion du budget personnel. Elle rassemble les revenus, les dépenses, l'épargne, les projets et les emprunts d'un particulier. Elle n'est pas destinée à un usage commercial.

La devise affichée est le franc CFA BCEAO (XOF). Les anciennes données en euros sont converties une fois au premier chargement, au taux fixe de 1 EUR = 655,957 XOF.

## Fonctionnalités

- Tableau de bord mensuel : solde net suivi, revenus, dépenses, épargne, évolution sur six mois et répartition des dépenses par catégorie.
- Transactions : ajout, modification, suppression et filtres par mois, type, catégorie ou libellé.
- Projets : montant cible, épargne déjà constituée, versement mensuel, échéance, progression et estimation du nombre de versements restants.
- Emprunts personnels : créancier, motif, montant initial, capital restant dû, mensualité, prochaine échéance et date de fin prévue.
- Remboursements : chaque règlement réduit le capital restant dû et est enregistré comme dépense dans les transactions. La dernière échéance est plafonnée au montant restant.
- Thème clair ou sombre et mise en page adaptée aux mobiles.
- Persistance locale dans le navigateur, sans compte ni serveur.

## Démarrer

Prérequis : Node.js et npm.

```sh
npm install
npm run dev
```

Vérifier le projet avant diffusion :

```sh
npm run lint
npm run build
```

## Stockage et confidentialité

Les transactions, projets et emprunts sont enregistrés dans `localStorage` sous la clé `fama-gestion-data-v2`. Ils restent sur le navigateur et l'appareil utilisés ; ils ne sont ni synchronisés ni sauvegardés sur un serveur. Effacer les données du site dans le navigateur les supprimera. Les anciennes données en euros (`fama-gestion-data-v1`) sont converties en XOF lors de leur migration et leur clé est ensuite supprimée. Les données d'exemple initiales sont fournies pour explorer l'interface et peuvent être supprimées.

## Structure

- `src/App.jsx` : interface, calculs, graphiques et interactions.
- `src/App.css` : présentation responsive et thèmes.
- `src/index.css` : règles globales.
- `src/main.jsx` : point d'entrée React.