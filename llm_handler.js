let hfToken = null;
let apiKey = null;
let gitToken = null;

const repoCache = new Map();

repoCache.set(
  'mushfiqurgalib/Clara-user-study-repo_2@main',
  ['file_1.c', 'file_2.c', 'original_refactor1.java', 'original_refactor2.java']
);

repoCache.set(
  'mushfiqurgalib/Clara-user-study-repo_1@master',
  ['.circleci', '.circleci/config.yml', '.gitignore', 'README.md', 'pom.xml', 'src/main/java/com/harium/keel/catalano/math/Approximation.java', 'src/main/java/com/harium/keel/catalano/math/ComplexNumber.java', 'src/main/java/com/harium/keel/catalano/math/Constants.java', 'src/main/java/com/harium/keel/catalano/math/Matrix.java', 'src/main/java/com/harium/keel/catalano/math/Special.java', 'src/main/java/com/harium/keel/catalano/math/TaylorSeries.java', 'src/main/java/com/harium/keel/catalano/math/Tools.java', 'src/main/java/com/harium/keel/catalano/statistics/Histogram.java', 'src/main/java/com/harium/keel/catalano/statistics/HistogramStatistics.java', 'src/main/java/org/opencv/CvStatus.java', 'src/main/java/org/opencv/OpenCv.java', 'src/main/java/org/opencv/criteria/CriteriaType.java', 'src/main/java/org/opencv/criteria/CvTermCriteria.java', 'src/main/java/org/opencv/modules/calib3d/Posit.java', 'src/main/java/org/spongepowered/noise/Noise.java', 'src/main/java/org/spongepowered/noise/NoiseQuality.java', 'src/main/java/org/spongepowered/noise/Utils.java', 'src/main/java/org/spongepowered/noise/exception/NoModuleException.java', 'src/main/java/org/spongepowered/noise/exception/NoiseException.java', 'src/main/java/org/spongepowered/noise/model/Cylinder.java', 'src/main/java/org/spongepowered/noise/model/Line.java', 'src/main/java/org/spongepowered/noise/model/Plane.java', 'src/main/java/org/spongepowered/noise/model/Sphere.java', 'src/main/java/org/spongepowered/noise/module/Cache.java', 'src/main/java/org/spongepowered/noise/module/Module.java', 'src/main/java/org/spongepowered/noise/module/combiner/Add.java', 'src/main/java/org/spongepowered/noise/module/combiner/Blend.java', 'src/main/java/org/spongepowered/noise/module/combiner/Displace.java', 'src/main/java/org/spongepowered/noise/module/combiner/Max.java', 'src/main/java/org/spongepowered/noise/module/combiner/Min.java', 'src/main/java/org/spongepowered/noise/module/combiner/Multiply.java', 'src/main/java/org/spongepowered/noise/module/combiner/Power.java', 'src/main/java/org/spongepowered/noise/module/combiner/Select.java', 'src/main/java/org/spongepowered/noise/module/modifier/Abs.java', 'src/main/java/org/spongepowered/noise/module/modifier/Clamp.java', 'src/main/java/org/spongepowered/noise/module/modifier/Curve.java', 'src/main/java/org/spongepowered/noise/module/modifier/Exponent.java', 'src/main/java/org/spongepowered/noise/module/modifier/Invert.java', 'src/main/java/org/spongepowered/noise/module/modifier/Range.java', 'src/main/java/org/spongepowered/noise/module/modifier/RotatePoint.java', 'src/main/java/org/spongepowered/noise/module/modifier/ScaleBias.java', 'src/main/java/org/spongepowered/noise/module/modifier/ScalePoint.java', 'src/main/java/org/spongepowered/noise/module/modifier/Terrace.java', 'src/main/java/org/spongepowered/noise/module/modifier/TranslatePoint.java', 'src/main/java/org/spongepowered/noise/module/modifier/Turbulence.java', 'src/main/java/org/spongepowered/noise/module/source/Billow.java', 'src/main/java/org/spongepowered/noise/module/source/Checkerboard.java', 'src/main/java/org/spongepowered/noise/module/source/Const.java', 'src/main/java/org/spongepowered/noise/module/source/Cylinders.java', 'src/main/java/org/spongepowered/noise/module/source/Perlin.java', 'src/main/java/org/spongepowered/noise/module/source/RidgedMulti.java', 'src/main/java/org/spongepowered/noise/module/source/Spheres.java', 'src/main/java/org/spongepowered/noise/module/source/Voronoi.java'] 
);

const systemInstruction = {
  role: 'developer',
  content: "You are a CLARA. Your task is to analyze github repo's files and answer to user's queries regarding different files. You must answer briefly, preferably within 100-120 words."
};

const LLM_URL = 'https://api.openai.com/v1/chat/completions';

// ✅ Promise to ensure config is loaded before handling messages
const configLoaded = new Promise((resolve, reject) => {
  fetch(chrome.runtime.getURL('config.json'))
    .then(response => response.json())
    .then(config => {
      apiKey = config.GPT_KEY;
      hfToken = config.HF_TOKEN;
      gitToken = config.GIT_KEY;
      console.log("✅ Token loaded");
      resolve();
    })
    .catch(err => {
      console.error("❌ Failed to load config.json:", err);
      reject(err);
    });
});

// ✅ Message listener waits for config to be loaded
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  configLoaded
    .then(() => handleMessage(message, sender, sendResponse))
    .catch(err => sendResponse({ success: false, error: 'Failed to load API keys' }));

  return true; // keep channel open for async `sendResponse`
});

// ✅ Message handler
function handleMessage(message, sender, sendResponse) {
  if (message.action === "askDeepSeek") {
    const payload = [systemInstruction, ...message.payload];
    console.log(payload);

    if (!apiKey) {
      console.warn("🚫 API key missing");
      sendResponse({ success: false, error: "API key not available" });
      return;
    }

    fetch(LLM_URL, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: payload
      })
    })
      .then(response => response.json())
      .then(data => {
        console.log(data);
        const content = data?.choices?.[0]?.message?.content || 'No response';
        sendResponse({ success: true, result: content });
      })
      .catch(error => {
        console.error("❌ LLM API error:", error);
        sendResponse({ success: false, error: error.message });
      });
  }

  else if (message.action === "repoTree") {
    const { owner, repo, branch } = message.payload;
    const cacheKey = `${owner}/${repo}@${branch}`;

    if (!gitToken) {
      console.warn("🚫 GitHub token missing");
      sendResponse({ success: false, error: "GitHub token not available" });
      return;
    }

    fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${gitToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      }
    })
      .then(response => response.json())
      .then(data => {
        let res = null;
        try {
          res = data.tree.map(item => item.path).sort().join('\n');
        } catch (e) {
          console.warn("⚠️ GitHub tree parse error, falling back to cache");
          if (repoCache.has(cacheKey)) {
            res = repoCache.get(cacheKey);
          } else {
            res = [];
          }
        }
        sendResponse({ success: true, result: res });
      })
      .catch(error => {
        console.error("❌ GitHub fetch error:", error);
        sendResponse({ success: false, error: error.message });
      });
  }
}
