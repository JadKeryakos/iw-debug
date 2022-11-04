// @flow
//
//  Copyright (c) 2018-present, Cruise LLC
//
//  This source code is licensed under the Apache License, Version 2.0,
//  found in the LICENSE file in the root directory of this source tree.
//  You may not use this file except in compliance with the License.

import ClipboardOutlineIcon from "@mdi/svg/svg/clipboard-outline.svg";
import cx from "classnames";
import React, { PureComponent } from "react";
import { hot } from "react-hot-loader/root";
import { Creatable as ReactSelectCreatable } from "react-select";
import VirtualizedSelect from "react-virtualized-select";
import { createSelector } from "reselect";
import helpContent from "./index.help.md";
import styles from "./index.module.scss";
import Flex from "webviz-core/src/components/Flex";
import Icon from "webviz-core/src/components/Icon";
import LogList from "webviz-core/src/components/LogList";
import MessageHistoryDEPRECATED, {
  type MessageHistoryData,
  type MessageHistoryItem,
} from "webviz-core/src/components/MessageHistoryDEPRECATED";
import Panel from "webviz-core/src/components/Panel";
import PanelToolbar from "webviz-core/src/components/PanelToolbar";
import TopicToRenderMenu from "webviz-core/src/components/TopicToRenderMenu";
import { cast, type ReflectiveMessage, type Topic } from "webviz-core/src/players/types";
import { type Header } from "webviz-core/src/types/Messages";
import clipboard from "webviz-core/src/util/clipboard";
import { $ROSOUT } from "webviz-core/src/util/globalConstants";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { Stats } from 'three/examples/jsm/libs/stats.module';

// Remove creatable warning https://github.com/JedWatson/react-select/issues/2181
class Creatable extends React.Component<{}, {}> {
  render() {
    return <ReactSelectCreatable {...this.props} />;
  }
}


type Option = {
  value: any,
  label: string,
};

type Config = {
  searchTerms: string[],
  minLogLevel: number,
  topicToRender: string,
};

type Props = {
  config: Config,
  saveConfig: (Config) => void,
  topics: Topic[],
};

class DollyDetection3D extends PureComponent<Props> {
  // static defaultConfig = { searchTerms: [], minLogLevel: 1, topicToRender: $ROSOUT };
  
  //Define panelt type as Terminal 
  static panelType = "Dolly Detection 3D";
  initialize = async (e) => {

    e.preventDefault();
    const imageFile = e.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onloadend = function (e){
      var myImage = new Image();
      myImage.src = e.target.result;
      myImage.onload = function(ev) {
        var myCanvas = document.getElementById('myCanvas');
        var myContext = myCanvas.getContext('2d');
        myCanvas.width = myImage.width;
        myCanvas.height = myImage.height;
        myContext.drawImage(myImage, 0, 0);
        let imgData = myCanvas.toDataURL("image/jpeg", 0.75);

        /* Start accessing image data */
        const depthData = myContext?.getImageData(0, 0, myImage.width, myImage.height).data;
        var points = [];
        var colors = [];
        const color = new THREE.Color();
        
        // center of the depth image (based on the camera intrinsics)
        // should be imported from the dolly detection folder -> camera_intrinsics
        const center = new THREE.Vector2(359.6040344238281, 640.873046875)

        // focal disctance of the camera of the STR (iw.hub)
        const focal = new THREE.Vector2(904.19287109375, 904.19287109375)
        for(var y=0; y<myImage.height; y++){
          for(var x=0; x<myImage.width; x++){
            if(depthData){
              var index = (x + y*myImage.width) * 4;
              var pixel = new THREE.Vector2(x,y);
              // var depthZ = depthData[index];
              
              // old method of getting the Z coordinate
              // var depthZ = depthData[index] / 255 * 10000;

              var newDepthZ = depthData[index];
              // var newDepthZ = nimg[index];
              // console.log('New DepZ: ', newDepthZ);
              
              var xy = new THREE.Vector2();
              xy.x = (pixel.x - center.x) * newDepthZ / focal.x;
              xy.y = (pixel.y - center.y) * newDepthZ / focal.y;
              // console.log(xy)
              // var a = new THREE.Vector2(); 
              // a.subVectors(pixel,center);
              
              // var b = new THREE.Vector2();
              // b = a.divide(focal);
              
              // var xy = new THREE.Vector2();
              // xy = b.multiplyScalar(newDepthZ);

              var vertex = new THREE.Vector3(xy.x,-xy.y, -newDepthZ);
              points.push(vertex);

              const vx = ( x / 1000 ) + 0.5;
              const vy = ( y / 1000 ) + 0.5;
              const vz = ( newDepthZ / 1000 ) + 0.5;
              color.setRGB( vx, vy, vz );
              colors.push( color.r, color.g, color.b );
              
            }
          }
        }
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, myImage.width / myImage.height, 0.1, 10000);
        const renderer = new THREE.WebGL1Renderer();
        renderer.setSize(myImage.width, myImage.height);
        const container = document.getElementById('dolly-ply');
        container?.appendChild(renderer.domElement)
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        var material = new THREE.PointsMaterial({size: 0.001, vertexColors: true});
        var pointsTo3D = new THREE.Points(geometry, material);
        scene.add(pointsTo3D);
        camera.position.z = 40;
        camera.near = 0.01;
        camera.far = 10000000000;
        const axesHelper = new THREE.AxesHelper( -15 );
        scene.add( axesHelper );
        var animate = function () {
            requestAnimationFrame(animate);

            renderer.render(scene, camera);
        };
        
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true;
        animate()
      }
    }

    // const camera = new THREE.PerspectiveCamera(
    //   30,
    //   window.innerWidth / window.innerHeight,
    //   0.1,
    //   0
    // )
  
    // camera.position.z = 5;
    // camera.position.x = 1;
  
    // const scene = new THREE.Scene()
    // scene.add(new THREE.AxesHelper(5))
  
    // const light = new THREE.SpotLight()
    // light.position.set(55, 55, 55)
    // scene.add(light)
    // scene.background = new THREE.Color(0x565656)
  
    // const container = document.getElementById( 'display-ply' );
        
    // const renderer = new THREE.WebGLRenderer();
  
    // renderer.setSize( 800, 800 );
    // container?.appendChild( renderer.domElement );
    // const controls = new OrbitControls(camera, renderer.domElement)
    // controls.enableDamping = true;
    // const reader = new FileReader();
    // var file = e.target.files[0];
    // var path = e.target.value;
    // const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    // const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    // const cube = new THREE.Mesh( geometry, material );
    // scene.add( cube );
  
    // renderer.render(scene, camera);
    // controls.update();
  }
  _renderFiltersBar = (seenNodeNames: Set<string>, msgs: $ReadOnlyArray<MessageHistoryItem>) => {
    const { minLogLevel, searchTerms } = this.props.config;
    const nodeNameOptions = Array.from(seenNodeNames).map((name) => ({ label: name, value: name }));

    return (
      <div className={styles.filtersBar}>
        <div>
        <input type="file" id="image-input" accept="image/*" style={{cursor: "pointer"}} onChange={(e) => this.initialize(e)} />
        </div>
      </div>
    );
  };

  render() {
    const { topics, config } = this.props;
    const seenNodeNames = new Set();    

    const topicToRenderMenu = (
      <TopicToRenderMenu
        topicToRender={config.topicToRender}  
        onChange={(topicToRender) => this.props.saveConfig({ ...this.props.config, topicToRender })}
        topics={topics}
        singleTopicDatatype="depth-image"
        defaultTopicToRender={$ROSOUT}
      />
    );

    return (
      <MessageHistoryDEPRECATED paths={[config.topicToRender]} historySize={100000}>
        {({ itemsByPath }: MessageHistoryData) => {
          const msgs: $ReadOnlyArray<MessageHistoryItem> = itemsByPath[config.topicToRender];

          return (
            <Flex col>
              <PanelToolbar helpContent={helpContent} additionalIcons={topicToRenderMenu}>
                {this._renderFiltersBar(seenNodeNames, msgs)}
              </PanelToolbar>      
              <canvas id="myCanvas" width={1280} height={720} style={{display: "none"}} ></canvas>
              <div id="dolly-ply"></div>
            </Flex>
          );
        }}
      </MessageHistoryDEPRECATED>
    );
  }
}

export default hot(Panel<Config>(DollyDetection3D));
