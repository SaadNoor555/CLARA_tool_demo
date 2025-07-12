let hfToken = null;
let apiKey = null;
let gitToken = null;

const repoCache = new Map();

repoCache.set(
  'mushfiqurgalib/Clara-user-study-repo_2@main', 
  [
    'file_1.c',
    'file_2.c',
    'original_refactor1.java',
    'original_refactor2.java'
  ]
);

repoCache.set(
  'mushfiqurgalib/Clara-user-study-repo_1@master',
  ['.circleci', '.circleci/config.yml', '.gitignore', 'README.md', 'pom.xml', 'src/main/java/com/harium/keel/catalano/math/Approximation.java', 'src/main/java/com/harium/keel/catalano/math/ComplexNumber.java', 'src/main/java/com/harium/keel/catalano/math/Constants.java', 'src/main/java/com/harium/keel/catalano/math/Matrix.java', 'src/main/java/com/harium/keel/catalano/math/Special.java', 'src/main/java/com/harium/keel/catalano/math/TaylorSeries.java', 'src/main/java/com/harium/keel/catalano/math/Tools.java', 'src/main/java/com/harium/keel/catalano/statistics/Histogram.java', 'src/main/java/com/harium/keel/catalano/statistics/HistogramStatistics.java', 'src/main/java/org/opencv/CvStatus.java', 'src/main/java/org/opencv/OpenCv.java', 'src/main/java/org/opencv/criteria/CriteriaType.java', 'src/main/java/org/opencv/criteria/CvTermCriteria.java', 'src/main/java/org/opencv/modules/calib3d/Posit.java', 'src/main/java/org/spongepowered/noise/Noise.java', 'src/main/java/org/spongepowered/noise/NoiseQuality.java', 'src/main/java/org/spongepowered/noise/Utils.java', 'src/main/java/org/spongepowered/noise/exception/NoModuleException.java', 'src/main/java/org/spongepowered/noise/exception/NoiseException.java', 'src/main/java/org/spongepowered/noise/model/Cylinder.java', 'src/main/java/org/spongepowered/noise/model/Line.java', 'src/main/java/org/spongepowered/noise/model/Plane.java', 'src/main/java/org/spongepowered/noise/model/Sphere.java', 'src/main/java/org/spongepowered/noise/module/Cache.java', 'src/main/java/org/spongepowered/noise/module/Module.java', 'src/main/java/org/spongepowered/noise/module/combiner/Add.java', 'src/main/java/org/spongepowered/noise/module/combiner/Blend.java', 'src/main/java/org/spongepowered/noise/module/combiner/Displace.java', 'src/main/java/org/spongepowered/noise/module/combiner/Max.java', 'src/main/java/org/spongepowered/noise/module/combiner/Min.java', 'src/main/java/org/spongepowered/noise/module/combiner/Multiply.java', 'src/main/java/org/spongepowered/noise/module/combiner/Power.java', 'src/main/java/org/spongepowered/noise/module/combiner/Select.java', 'src/main/java/org/spongepowered/noise/module/modifier/Abs.java', 'src/main/java/org/spongepowered/noise/module/modifier/Clamp.java', 'src/main/java/org/spongepowered/noise/module/modifier/Curve.java', 'src/main/java/org/spongepowered/noise/module/modifier/Exponent.java', 'src/main/java/org/spongepowered/noise/module/modifier/Invert.java', 'src/main/java/org/spongepowered/noise/module/modifier/Range.java', 'src/main/java/org/spongepowered/noise/module/modifier/RotatePoint.java', 'src/main/java/org/spongepowered/noise/module/modifier/ScaleBias.java', 'src/main/java/org/spongepowered/noise/module/modifier/ScalePoint.java', 'src/main/java/org/spongepowered/noise/module/modifier/Terrace.java', 'src/main/java/org/spongepowered/noise/module/modifier/TranslatePoint.java', 'src/main/java/org/spongepowered/noise/module/modifier/Turbulence.java', 'src/main/java/org/spongepowered/noise/module/source/Billow.java', 'src/main/java/org/spongepowered/noise/module/source/Checkerboard.java', 'src/main/java/org/spongepowered/noise/module/source/Const.java', 'src/main/java/org/spongepowered/noise/module/source/Cylinders.java', 'src/main/java/org/spongepowered/noise/module/source/Perlin.java', 'src/main/java/org/spongepowered/noise/module/source/RidgedMulti.java', 'src/main/java/org/spongepowered/noise/module/source/Spheres.java', 'src/main/java/org/spongepowered/noise/module/source/Voronoi.java'] 
);

// https://router.huggingface.co/fireworks-ai/inference/v1/chat/completions
// headers: {
//         "Authorization": `Bearer ${TOKEN}`,
//         "Content-Type": "application/json"
//       }

// body: JSON.stringify({
//         messages: [
//           {
//             role: "user",
//             content: message.payload || "What is the capital of France?"
//           }
//         ],
//         model: "accounts/fireworks/models/deepseek-r1-0528",
//         stream: false
//       })


const systemInstruction = {
    parts: [{
      text: "You are a CLARA. Your task is to analyze github repo's files and answer to user's queries regarding different files. You must answer briefly, preferably within 100-120 words."
    }]
  };

const LLM_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// Load token on startup
fetch(chrome.runtime.getURL("config.json"))
  .then(response => response.json())
  .then(config => {
    apiKey = config.API_KEY
    hfToken = config.HF_TOKEN;
    gitToken = config.GIT_KEY;
    console.log("✅ Token loaded");
  })
  .catch(err => console.error("❌ Failed to load config.json:", err));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  if (message.action === "askDeepSeek") {
    // console.log("payload: ")
    

    var payload = {
      systemInstruction,
      contents: message.payload,
    };

    console.log(payload);
    const TOKEN = apiKey; // Replace this with your actual token

    fetch(LLM_URL, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': TOKEN,
      },
      body: JSON.stringify(payload)
    })
      .then(response => response.json())
      .then(data => {
        console.log(data);
        sendResponse({ success: true, result: data["candidates"][0]["content"]["parts"][0]["text"] });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keeps the message channel open for async `sendResponse`
  }


  else if(message.action == "repoTree") {

    const GITHUB_TOKEN = gitToken;
    const OWNER = message.payload['owner']
    const REPO = message.payload['repo']
    const BRANCH = message.payload['branch']

    // console.log()
    console.log(OWNER, REPO, BRANCH)
    fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      }
    })
    .then(response => response.json())
      .then(data => {
        console.log(data);
        let res = null;
        try {
          res = data.tree.map(item => item.path).sort().join('\n');
        }
        catch {
          if(repoCache.has(`${OWNER}/${REPO}@${BRANCH}`)) {
            console.log('getting from cache');
            res = repoCache.get(`${owner}/${repo}@${branch}`);
          }
          else {
            console.log('could not get repo');
            res = [];
          }
        }
        sendResponse({ success: true, result: res});
      })
      .catch(error => {
        console.log(error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});
