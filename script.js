const themetoggle = document.querySelector(".theme-toggle");
const PromptForm = document.querySelector(".prompt-form");
const PromptInput = document.querySelector(".prompt-input");
const PromptBtn = document.querySelector(".random-btn");
const modalSelect = document.getElementById("model-select");
const imageSelect = document.getElementById("image-select");
const ratioSelect = document.getElementById("ratio-select");
const Gallerygrid = document.querySelector(".gallery-grid");

const NOT_AN_API_KEY = "YOUR_HUGGING_FACE_TOKEN"

const randomPrompt = [
    "A magic forest with glowing plants and fairy homes among giant mushrooms",
    "An old steampunk airship floating through golden clouds at sunset",
    "A future Mars colony with glass domes and gardens against red mountains",
    "A dragon sleeping on gold coins in a crystal cave",
    "An underwater kingdom with merpeople and glowing coral buildings",
    "A floating island with waterfalls pouring into clouds below",
    "A witch's cottage in fall with magic herbs in the garden",
    "A robot painting in a sunny studio with art supplies around it",
    "A magical library with floating glowing books and spiral staircases",
    "A Japanese shrine during cherry blossom season with lanterns and misty mountains",
    "A cosmic beach with glowing sand and an aurora in the night sky",
    "A medieval marketplace with colorful tents and street performers",
    "A cyberpunk city with neon signs and flying cars at night",
    "A peaceful bamboo forest with a hidden ancient temple",
    "A giant turtle carrying a village on its back in the ocean",
];


(() => {
    const savedtheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme : dark)").matches;

    isDarktheme = savedtheme === "dark" || (!savedtheme && systemPrefersDark);
    document.body.classList.toggle("dark-theme", isDarktheme);
    themetoggle.querySelector("i").textContent = isDarktheme ? "☾" : "☀️" ;

})();

const toggletheme = () =>{
    var isDarktheme = document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", isDarktheme ? "dark" : "light");
    themetoggle.querySelector("i").textContent = isDarktheme ? "☾" : "☀️" ;
}

const getImageDimension=(selectratio, baseSize = 512)=>{
    const [width, height] = selectratio.split("/").map(Number);
    const scalefactor = baseSize/Math.sqrt(width*height);

    var calculatedwidth = Math.round(width*scalefactor);
    var calculatedheight = Math.round(height*scalefactor);

    calculatedwidth = Math.floor(calculatedwidth/16)*16;
    calculatedheight = Math.floor(calculatedheight/16)*16;

    return{width: calculatedwidth, height: calculatedheight};

};
const updateImageCard=(ImgIndex, ImgUrl)=>{
    var ImageCard = document.getElementById(`image-card-${ImgIndex}`);
    if(!ImageCard) return;

    ImageCard.classList.remove("loading");
    ImageCard.innerHTML = `<img src="${ImgUrl}" class="result-img"/>
                            <div class="image-overlay">
                                <a href="${ImgUrl}" class="download-btn" download="${Date.now()}.png">
                                    ⬇️ 
                                </a>
                            </div>`;
}

const generateImage=async(selectmodal, selectimage, selectratio, selectprompt)=>{
    const BASE_URL = `https://router.huggingface.co/hf-inference/models/${selectmodal}`;
    const {width, height} = getImageDimension(selectratio)
    const imagePromises = Array.from({length:selectimage}, async(_,i)=>{
        try{
        const response = await fetch(
        BASE_URL,{
            method: "POST",
            headers: {
                Authorization: `Bearer ${NOT_AN_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: selectprompt,
                parameters:{width, height},
                options :{wait_for_model:true,
                     use_cache:false}
            }),
        })
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Image generation failed");
        }
    const result = await response.blob();
    updateImageCard(i, URL.createObjectURL(result));
    console.log(result)
    }
    catch(error){
        console.log(error);
    }
    });
    await Promise.allSettled(imagePromises);

    };





const createImageCard = (selectmodal, selectimage, selectratio, selectprompt)=>{

    Gallerygrid.innerHTML = "";

    for(let i =0; i<selectimage; i++){
        Gallerygrid.innerHTML+= `<div class="image-card loading" id="img-card-${i}" style="aspect-ratio:${selectratio}">
                                    <div class="status-container">
                                        <div class="spinner"></div>
                                        <i class="error">❗️</i>
                                        <p class="status-text">Generating...</p>
                                    </div>
                                        <img src="test.jpeg" class="result-img"/>
                                </div>`;
    }
    generateImage(selectmodal, selectimage, selectratio, selectprompt);
}

const handleFormSubmit = (e)=>{
    e.preventDefault()

    const selectmodal = modalSelect.value;
    const selectimage = parseInt(imageSelect.value) || 1;
    const selectratio = ratioSelect.value || "1/1";
    const selectprompt = PromptInput.value.trim();

    createImageCard(selectmodal, selectimage, selectratio, selectprompt );
}

PromptBtn.addEventListener("click", () =>{
    const prompt = randomPrompt[Math.floor(Math.random() * randomPrompt.length)];
    PromptInput.value = prompt;
    PromptInput.focus();

});



PromptForm.addEventListener("submit", handleFormSubmit);

themetoggle.addEventListener("click", toggletheme);
