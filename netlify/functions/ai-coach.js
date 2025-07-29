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
      const { intention, gratitude, reflection, incarnation, dayNumber } = JSON.parse(event.body);
      
      // Votre clé API depuis les variables d'environnement Netlify
      const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
      
      const systemPrompt = `Tu es un coach spirituel inspiré par les enseignements de Neville Goddard. 
      Tu analyses les entrées de journal de transformation personnelle et donnes des feedbacks encourageants et profonds.
      
      Principes à suivre:
      - Toujours être positif et encourageant
      - Citer ou paraphraser Neville quand c'est pertinent
      - Mettre l'accent sur le pouvoir de l'imagination et du sentiment
      - Rappeler l'importance de vivre dans l'état souhaité
      - Être concis mais impactant (max 150 mots)
      - Utiliser des métaphores spirituelles
      - Terminer par une affirmation puissante ou un conseil pratique`;
  
      const userPrompt = `Jour ${dayNumber} du programme.
      Intention: ${intention}
      Gratitude: ${gratitude}
      Réflexion: ${reflection}
      Niveau d'incarnation: ${incarnation}/10
      
      Donne un feedback personnalisé et motivant basé sur ces entrées.`;
  
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Modèle économique
          max_tokens: 300,
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
          // Fallback sur un message générique
          message: "Continue ton magnifique travail ! Chaque jour, tu te rapproches de ton état désiré. Souviens-toi : l'imagination est la clé de toute transformation."
        })
      };
    }
  };