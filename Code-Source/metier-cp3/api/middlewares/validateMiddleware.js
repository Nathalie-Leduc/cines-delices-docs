// Middleware générique de validation Zod
// Structure validée : { body, params, query }
// Utilisation dans un router

export const validate = (shema) => (req, res, next) => {
  try {
    // safeParse ne lève pas d'exception : retourne ( success, data, error )
    const result = shema.safeParse({
      body:   req.body,
      params: req.params,
      query:  req.query,
    });

    if (!result.success) {
      // Formater les erreurs Zod en messages lisibles
      // ZodError.flatten() regroupe par champ : { fieldErrors, formErrors }
      const formatted = result.error.flatten();

      // Construire un tableau de messages clairs pour le front
      // ex: ["email: Format email invalide", "password: 8 caractères minimum"]
      const messages = [];

      // Erreurs par champ (dans body, params, query)
      for (const [field, errors] of Object.entries(formatted.fieldErrors)) {
        // field peut être "body.email", on enlève le préfixe "body."
        const cleanField = field;
        errors.forEach(msg => messages.push(`${cleanField}: ${msg}`));
      }

      // Erreurs globales (ex: refine sur l'objet entier)
      formatted.formErrors.forEach(msg => messages.push(msg));
      
      return res.status(400).json({
        error: 'Données invalides',
        details: messages,
      });
    }

    // Données valides et transformées (ex: email normalisé en lowercase)
    // On réinjecte les données nettoyées dans req 
    // req.body et req.params sont modifiables — req.query est en lecture
    // seule dans Express, on copie ses propriétés plutôt que de le remplacer
    if (result.data.body) req.body = result.data.body;
    if (result.data.params) req.params = result.data.params;
    if (result.data.query) {
      // req.query est un getter - on copie les propriétés une par une
      Object.assign(req.query, result.data.query);
    }
    
    next()

  } catch (error) {
    // Ne devrait pas arriver mais on fait ceinture-bretelles
    next(error);
  }
};
