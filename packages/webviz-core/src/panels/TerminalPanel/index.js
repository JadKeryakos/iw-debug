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

class TerminalPanel extends PureComponent<Props> {
  // static defaultConfig = { searchTerms: [], minLogLevel: 1, topicToRender: $ROSOUT };
  
  //Define panelt type as Terminal 
  static panelType = "Terminal";

  _renderFiltersBar = (seenNodeNames: Set<string>, msgs: $ReadOnlyArray<MessageHistoryItem>) => {
    const { minLogLevel, searchTerms } = this.props.config;
    const nodeNameOptions = Array.from(seenNodeNames).map((name) => ({ label: name, value: name }));

    // Add the input button receiving txt files having a `showFile` function that renders the uploaded txt file
    return (
      <div className={styles.filtersBar}>
        <div>
          <input type="file" accept=".txt" onChange={(e) => this.showFile(e)} style={{cursor: "pointer"}} />
        </div>
      </div>
    );
  };

  //Check the terminal file content
  showFile = async (e) => {
    e.preventDefault()

    //Read the text file using the FileReader
    const reader = new FileReader()
    var file = e.target.files[0];
    console.log(e.target.value)
    reader.onload = async (e) => { 
      const text = (e.target.result)
      
      //Splitting each line of the text file
      let line = text.split("\n")

      //Emptying the div on each new text file uploaded
      var el = document.getElementById('terminal')
      el.innerHTML = '';
      el.setAttribute('style', 'height: 850px; overflow-y: scroll; padding-left: 1.5rem;')
      
      //Looping over each line of the text file
      for(let i=0; i<line.length; i++){
        var tag = document.createElement('p')
        var txt = document.createTextNode(line[i])
        console.log(line[i])

        //Setting each line's color based on its content's information (errors, warnings and info/debug)
        if(line[i].includes('ERROR')){
          tag.setAttribute('style', 'color: red')
        }else if(line[i].includes('WARN')){
          tag.setAttribute('style', 'color: yellow')
        }else{
          tag.setAttribute('style', 'color: white')
        }
        tag.appendChild(txt)
        
        el.appendChild(tag)
      }
    };
    reader.readAsText(e.target.files[0])
  }


  render() {
    const { topics, config } = this.props;
    const seenNodeNames = new Set();

    const topicToRenderMenu = (
      <TopicToRenderMenu
        topicToRender={config.topicToRender}
        onChange={(topicToRender) => this.props.saveConfig({ ...this.props.config, topicToRender })}
        topics={topics}
        singleTopicDatatype="terminal-output/Log"
        defaultTopicToRender={$ROSOUT}
      />
    );

    return (
      <MessageHistoryDEPRECATED paths={[config.topicToRender]} historySize={100000}>
        {({ itemsByPath }: MessageHistoryData) => {
          const msgs: $ReadOnlyArray<MessageHistoryItem> = itemsByPath[config.topicToRender];
          
          //Adding the div that contains the data from the terminal output text file
          return (
            <Flex col>
              <PanelToolbar helpContent={helpContent} additionalIcons={topicToRenderMenu}>
                {this._renderFiltersBar(seenNodeNames, msgs)}
              </PanelToolbar>
              <div id="terminal"></div>              
            </Flex>
          );
        }}
      </MessageHistoryDEPRECATED>
    );
  }
}

export default hot(Panel<Config>(TerminalPanel));
