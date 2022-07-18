/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {makeComputedArtifact} from '../computed-artifact.js';
import ComputedMetric from './metric.js';
import {TraceProcessor} from '../../lib/tracehouse/trace-processor.js';
import LanternTotalBlockingTime from './lantern-total-blocking-time.js';
import TimetoInteractive from './interactive.js';
import {calculateSumOfBlockingTime} from './tbt-utils.js';

/**
 * @fileoverview This audit determines Total Blocking Time.

 * We define Blocking Time as any time interval in the loading timeline where task length exceeds
 * 50ms. For example, if there is a 110ms main thread task, the last 60ms of it is blocking time.
 * Total Blocking Time is the sum of all Blocking Time between First Contentful Paint and
 * Interactive Time (TTI).
 *
 * This is a new metric designed to accompany Time to Interactive. TTI is strict and does not
 * reflect incremental improvements to the site performance unless the improvement concerns the last
 * long task. Total Blocking Time on the other hand is designed to be much more responsive
 * to smaller improvements to main thread responsiveness.
 */
class TotalBlockingTime extends ComputedMetric {
  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, context) {
    const metricData = ComputedMetric.getMetricComputationInput(data);
    return LanternTotalBlockingTime.request(metricData, context);
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeObservedMetric(data, context) {
    const events = TraceProcessor.getMainThreadTopLevelEvents(data.processedTrace);

    if (data.processedNavigation) {
      const {firstContentfulPaint} = data.processedNavigation.timings;
      const metricData = ComputedMetric.getMetricComputationInput(data);
      const interactiveTimeMs = (await TimetoInteractive.request(metricData, context)).timing;

      return {
        timing: calculateSumOfBlockingTime(
          events,
          firstContentfulPaint,
          interactiveTimeMs
        ),
      };
    } else {
      return {
        timing: calculateSumOfBlockingTime(
          events,
          0,
          data.processedTrace.timestamps.traceEnd
        ),
      };
    }
  }
}

export default makeComputedArtifact(
  TotalBlockingTime,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
