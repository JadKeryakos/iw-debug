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
import LevelToString, { KNOWN_LOG_LEVELS } from "./LevelToString";
import LogMessage from "./LogMessage";
import logStyle from "./LogMessage.module.scss";
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


// Persist the identity of selectedOptions for React Creatable.
// Without it, we can't create new options.
export const stringsToOptions = createSelector<*, *, *, _>(
  (strs: string[]) => strs,
  (strs: string[]): Option[] => strs.map((value) => ({ label: value, value }))
);

type RosgraphMsgs$Log = $ReadOnly<{|
  header: Header,
  level: number,
  name: string,
  msg: string,
  file: string,
  function: string,
  line: number,
  topics: $ReadOnlyArray<string>,
|}>;

export const getShouldDisplayMsg = (
  message: ReflectiveMessage,
  minLogLevel: number,
  searchTerms: string[]
): boolean => {
  const logMessage = cast<RosgraphMsgs$Log>(message.message);
  if (logMessage.level < minLogLevel) {
    return false;
  }

  if (searchTerms.length < 1) {
    // No search term filters so this message should be visible.
    return true;
  }
  const searchTermsInLowerCase = searchTerms.map((term) => term.toLowerCase());
  const { name, msg } = logMessage;
  const lowerCaseName = name.toLowerCase();
  const lowerCaseMsg = msg.toLowerCase();
  return searchTermsInLowerCase.some((term) => lowerCaseName.includes(term) || lowerCaseMsg.includes(term));
};

class TerminalPanel extends PureComponent<Props> {
  static defaultConfig = { searchTerms: [], minLogLevel: 1, topicToRender: $ROSOUT };
  static panelType = "Terminal";

  _onNodeFilterChange = (selectedOptions: Option[]) => {
    this.props.saveConfig({ ...this.props.config, searchTerms: selectedOptions.map((option) => option.value) });
  };

  _onLogLevelChange = (minLogLevel: number) => {
    this.props.saveConfig({ ...this.props.config, minLogLevel });
  };

  _filterFn = (item: MessageHistoryItem) =>
    getShouldDisplayMsg(item.message, this.props.config.minLogLevel, this.props.config.searchTerms);

  _getFilteredMessages(items: $ReadOnlyArray<MessageHistoryItem>): $ReadOnlyArray<MessageHistoryItem> {
    const { minLogLevel, searchTerms } = this.props.config;
    const hasActiveFilters = minLogLevel > 1 || searchTerms.length > 0;
    if (!hasActiveFilters) {
      // This early return avoids looping over the full list with a filter that will always return true.
      return items;
    }
    return items.filter(this._filterFn);
  }

  _renderFiltersBar = (seenNodeNames: Set<string>, msgs: $ReadOnlyArray<MessageHistoryItem>) => {
    const { minLogLevel, searchTerms } = this.props.config;
    const nodeNameOptions = Array.from(seenNodeNames).map((name) => ({ label: name, value: name }));

    return (
      <div className={styles.filtersBar}>
        <div>
          <input type="file" onChange={(e) => this.showFile(e)} style={{cursor: "pointer"}} />
        </div>
      </div>
    );
  };
  _renderRow({ item, style, key, index }) {
    return (
      <div key={key} style={index === 0 ? { ...style, paddingTop: 36 } : style}>
        <LogMessage msg={item.message.message} />
      </div>
    );
  }

  showFile = async (e) => {
    e.preventDefault()
    const reader = new FileReader()
    reader.onload = async (e) => { 
      const text = (e.target.result)
      let line = text.split("\n")
      var el = document.getElementById('terminal')
      el.innerHTML = '';
      el.setAttribute('style', 'height: 850px; overflow-y: scroll; padding-left: 1.5rem;')
      for(let i=0; i<line.length; i++){
        var tag = document.createElement('p')
        var txt = document.createTextNode(line[i])
        console.log(line[i])
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
        singleTopicDatatype="rosgraph_msgs/Log"
        defaultTopicToRender={$ROSOUT}
      />
    );

    return (
      <MessageHistoryDEPRECATED paths={[config.topicToRender]} historySize={100000}>
        {({ itemsByPath }: MessageHistoryData) => {
          const msgs: $ReadOnlyArray<MessageHistoryItem> = itemsByPath[config.topicToRender];
          // msgs.forEach((msg) => seenNodeNames.add(cast<RosgraphMsgs$Log>(msg.message.message).name));

          return (
            <Flex col>
              <PanelToolbar helpContent={helpContent} additionalIcons={topicToRenderMenu}>
                {this._renderFiltersBar(seenNodeNames, msgs)}
              </PanelToolbar>
              <div id="terminal"></div>
              <div className={styles.content}>
                <LogList items={this._getFilteredMessages(msgs)} renderRow={this._renderRow} />
              </div>
            </Flex>
          );
        }}
      </MessageHistoryDEPRECATED>
    );
  }
}

export default hot(Panel<Config>(TerminalPanel));
