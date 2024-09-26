import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import axios from "axios";

const monkeyUrl = new URL('./final_avatar_controls.glb', import.meta.url);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
var value;
var animationName = '';
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

renderer.setClearColor(0xA3A3A3);

const orbit = new OrbitControls(camera, renderer.domElement);
//camera.position.set(10, 10, 10);
orbit.update();

const grid = new THREE.GridHelper(30, 30);
scene.add(grid);

const assetLoader = new GLTFLoader();

let mixer;
let model;
let action;
function loadAnimation(animationPrompt,zoom){
    assetLoader.load(monkeyUrl.href, function (gltf) {
        if (model) {
            scene.remove(model);
            mixer.stopAllAction();
        }
        model = gltf.scene;
        const boundingBox = new THREE.Box3().setFromObject(model);
        const modelHeight = boundingBox.getSize(new THREE.Vector3()).y;
        const modelWidth = boundingBox.getSize(new THREE.Vector3()).x; 
        const screenHeight = window.innerHeight;
        const screenWidth = window.innerWidth;
        const fov = 45;
        const aspectRatio = screenWidth / screenHeight;
        const distance = (modelHeight / Math.tan((fov / 2) * Math.PI / 180)) / 2;
        const halfScreenWidth = screenWidth / 2;
        const halfModelWidth = modelWidth / 2;
        const fovX = (Math.atan(halfModelWidth / distance) * 2) * (180 / Math.PI);
        console.log(distance*zoom);
        if(zoom){
            camera.position.set(2, 5, distance*zoom);
        }else{
            camera.position.set(2, 5, distance*5);
        }
        camera.aspect = aspectRatio;
        camera.fov = fovX;
        camera.updateProjectionMatrix();    
        scene.add(model);
        mixer = new THREE.AnimationMixer(model);
        const clips = gltf.animations;  
        const animationNames = clips.map(clip => clip.name);
        const apiUrl = 'https://text-to-animation.onrender.com/query';
        const queryData = {
            query: animationPrompt,
            documents: animationNames,
            topk: 3 
        };
        axios.post(apiUrl,queryData)
        .then((res)=>{
            console.log(res);
            let maxScore = -Infinity;
            res.data.forEach(output => {
                if (output.score > maxScore) {
                    maxScore = output.score;
                    animationName = output.text;
                }
            });
            console.log(animationName);
        }).catch((err)=>{
            console.log(err);
        })
        if(animationName){
            const clip = THREE.AnimationClip.findByName(clips, animationName);
            action = mixer.clipAction(clip);    
        }
        else{
            const clip = THREE.AnimationClip.findByName(clips,"normal");    
            action = mixer.clipAction(clip); 
        }
        action.loop = THREE.LoopOnce;
        action.clampWhenFinished = true;
        action.play();
    }, undefined, function (error) {
        console.error(error);
    });
}
// Add directional light to illuminate the model
const directionalLight = new THREE.DirectionalLight(0xffffff);
directionalLight.position.set(2, 5, 30);
scene.add(directionalLight);


const clock = new THREE.Clock();
function animate() {
    if (mixer)
        mixer.update(clock.getDelta());
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

var el = document.getElementById("form");
var input = document.getElementById("text-bar");
const zoomSlider = document.getElementById('zoom-slider');

el.addEventListener("submit",(e)=>{
    e.preventDefault();
    value = input.value;
    const maxZoom = 10;
    const zoom = parseFloat(zoomSlider.value);
    const realZoom = maxZoom-zoom+1;
    loadAnimation(value,realZoom);
})
loadAnimation();

var recognition;
    var finalTranscript = '';

    // Function to start recording
    function startRecording() {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = function(event) {
        var interimTranscript = '';
        for (var i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        document.getElementById('transcript').innerText = interimTranscript;
      };

      recognition.start();
      document.getElementById('audio-instruction').style.display = 'none';
      document.getElementById('stop-recording').style.display = 'inline';
    }

    // Function to stop recording
    function stopRecording() {
        recognition.stop();
        document.getElementById('audio-instruction').style.display = 'inline';
        document.getElementById('stop-recording').style.display = 'none';
        document.getElementById('transcript').innerText = finalTranscript;
      
        // Convert transcript to lowercase
        const transcriptLowerCase = finalTranscript.toLowerCase();
        
        // Save the transcript in a variable called 'value'
        input.value = transcriptLowerCase;
      
        // Load animation with the lowercase transcript value
        const maxZoom = 10;
        const zoom = parseFloat(zoomSlider.value);
        const realZoom = maxZoom - zoom + 1;
        loadAnimation(transcriptLowerCase, realZoom);
      }
      
    document.getElementById('audio-instruction').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);

    