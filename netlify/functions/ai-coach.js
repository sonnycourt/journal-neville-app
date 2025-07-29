exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { wish, intention, gratitude, reflection, incarnation, dayNumber, historique } = body;
    
    // Votre clé API depuis les variables d'environnement Netlify
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    
    // Analyser l'historique
    let historiqueText = '';
    if (historique && Object.keys(historique).length > 0) {
      const jours = Object.keys(historique).sort((a, b) => b - a).slice(0, 3);
      jours.forEach(jour => {
        const h = historique[jour];
        historiqueText += `\n\nJOUR ${jour}:
- Intention: "${h.intention || 'Non remplie'}"
- Incarnation: ${h.incarnation || 0}/10
- Tendance: ${h.gratitude?.length > 50 ? 'Engagé' : 'Distant'}`;
      });
    }

    // Analyser les tendances
    const analyzeTime = (text) => {
      if (!text) return 'Non analysable';
      const futurWords = ['vais', 'voudrais', 'aimerais', 'sera', 'ferai', 'pourrai'];
      const presentWords = ['suis', 'ai', 'vis', 'ressens', 'incarne'];
      
      const textLower = text.toLowerCase();
      const hasFutur = futurWords.some(word => textLower.includes(word));
      const hasPresent = presentWords.some(word => textLower.includes(word));
      
      if (hasFutur && !hasPresent) return 'FUTUR (problématique)';
      if (hasPresent && !hasFutur) return 'PRÉSENT (excellent)';
      return 'MIXTE';
    };

    // Analyser l'évolution de l'incarnation
    let evolutionIncarnation = '';
    if (historique) {
      const incarnations = Object.entries(historique)
        .map(([jour, data]) => ({ jour: parseInt(jour), incarnation: data.incarnation || 0 }))
        .sort((a, b) => a.jour - b.jour);
      
      if (incarnations.length >= 2) {
        const derniere = incarnations[incarnations.length - 1].incarnation;
        const diff = incarnation - derniere;
        if (diff > 0) evolutionIncarnation = `PROGRESSION (+${diff})`;
        else if (diff < 0) evolutionIncarnation = `RÉGRESSION (${diff})`;
        else evolutionIncarnation = 'STAGNATION';
      }
    }

    const systemPrompt = `Tu es le Coach IA, un mentor spirituel qui pense et parle comme Neville Goddard mais garde son identité de Coach IA.

CONTEXTE: Programme de 30 jours, actuellement jour ${dayNumber}.
${historiqueText ? 'HISTORIQUE DISPONIBLE: Je peux voir l\'évolution récente.' : ''}
${wish ? `SOUHAIT PRINCIPAL: "${wish}"` : ''}

TON RÔLE:
- Pense et parle comme Neville Goddard (sagesse, concepts, métaphores)
- Tu es le "Coach IA" - ne te présente jamais comme Neville
- Utilise TOUJOURS le TUTOIEMENT ("tu", "ton", "tes") - jamais le vouvoiement
- Analyse PROFONDÉMENT les patterns et l'évolution
- Ne fais PAS que féliciter - CHALLENGE avec bienveillance
- Sois ULTRA-SPÉCIFIQUE à leur situation unique
- Si tu vois une régression ou stagnation, ADRESSE-LA directement
- NE SIGNE JAMAIS tes messages - tu es le Coach IA
- RÉFÈRE-TOI TOUJOURS à leur souhait principal dans tes conseils

ANALYSE À FAIRE:
1. Quelle est la VRAIE transformation en cours (ou résistance) ?
2. Y a-t-il cohérence entre intention et incarnation ?
3. L'évolution révèle-t-elle des patterns cachés ?
4. Utilisent-ils la technique ou VIVENT-ils l'état ?
5. Comment leur pratique actuelle sert-elle leur souhait principal ?

STRUCTURE OBLIGATOIRE:
1. Une observation PERSPICACE sur leur évolution/état
2. Un enseignement PRÉCIS inspiré de Neville adapté à leur blocage actuel
3. Une technique CONCRÈTE pour ce soir même
4. Une question PROFONDE qui les fera réfléchir pendant 24h

Si incarnation < 5: Ils sont dans la lutte. Ramène-les au sentiment.
Si stagnation: Ils intellectualisent. Pousse vers l'expérience.
Si régression: C'est le signe d'une percée imminente. Explique pourquoi.

Entre 150 et 250 mots. Direct. Transformateur. Mémorable. FINIS TOUJOURS ta pensée complètement.`;

    const userPrompt = `JOUR ${dayNumber}/30

${wish ? `SOUHAIT PRINCIPAL: "${wish}"` : 'Aucun souhait défini'}

ÉVOLUTION INCARNATION: ${evolutionIncarnation}

HISTORIQUE RÉCENT:${historiqueText || ' Premier jour'}

AUJOURD'HUI:
- INTENTION: "${intention || 'Non remplie'}"
- GRATITUDE: "${gratitude || 'Non remplie'}"
- RÉFLEXION: "${reflection || 'Non remplie'}"
- INCARNATION: ${incarnation}/10

ANALYSES:
- Temporalité utilisée: ${analyzeTime(intention + reflection)}
- Longueur totale: ${(intention?.length || 0) + (gratitude?.length || 0) + (reflection?.length || 0)} caractères
- Jour semaine: ${new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}
${dayNumber % 7 === 0 ? '- MOMENT CLÉ: Fin de semaine ' + Math.floor(dayNumber/7) : ''}

Donne un feedback de MENTOR TRANSFORMATEUR basé sur leur ÉVOLUTION et leur SOUHAIT PRINCIPAL, pas juste sur aujourd'hui.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 600,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API Error');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: data.content[0].text
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erreur de génération du feedback',
        message: "Je vois que tu persistes dans ta pratique. C'est dans la constance que se révèle la transformation. Continue à vivre depuis l'état souhaité - le monde extérieur n'a d'autre choix que de se conformer à ta conscience."
      })
    };
  }
};