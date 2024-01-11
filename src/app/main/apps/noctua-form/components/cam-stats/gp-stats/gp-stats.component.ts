import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { getColor } from '@noctua.common/data/noc-colors';
import { ActivityNode, ActivityNodeType, CamStatsService, BbopGraphService, NoctuaLookupService, TermsSummary } from '@geneontology/noctua-form-base';
import { Subject } from 'rxjs';

@Component({
  selector: 'noc-gp-stats',
  templateUrl: './gp-stats.component.html',
  styleUrls: ['./gp-stats.component.scss']
})
export class GPStatsComponent implements OnInit, OnDestroy {
  @Input()
  termsSummary: TermsSummary;

  aspectPieOptions = {
    view: [500, 200],
    gradient: true,
    legend: false,
    showLabels: true,
    isDoughnut: false,
    maxLabelLength: 20,
    colorScheme: {
      domain: [getColor('green', 500), getColor('brown', 500), getColor('purple', 500)]
    },

  }

  termsBarOptions = {
    view: [500, 400],
    showXAxis: true,
    showYAxis: true,
    gradient: false,
    legend: false,
    showXAxisLabel: true,
    maxYAxisTickLength: 30,
    yAxisLabel: 'Gene Products',
    showYAxisLabel: true,
    xAxisLabel: 'Count',
  }

  stats = {
    gpPie: [],
    termsBar: [],
  }

  private _unsubscribeAll: Subject<any>;

  constructor(
    private _camStatsService: CamStatsService,
  ) {
    this._unsubscribeAll = new Subject();
  }

  ngOnInit(): void {

    this.stats.gpPie = this._camStatsService.buildTermsPie(this.termsSummary.gp.nodes)
    this.stats.termsBar = this._camStatsService.buildTermsDistribution([this.termsSummary.gp])

    //this.getCustomColors(this.stats.termsBar)
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }


}
