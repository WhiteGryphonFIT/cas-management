import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {AppConfigService, PaginatorComponent} from 'shared-lib';
import {ServiceItem} from 'domain-lib';
import {ActivatedRoute, Router} from '@angular/router';
import {ServiceViewService} from './service.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import {DeleteComponent} from '../delete/delete.component';
import {RevertComponent} from '../../project-share/revert/revert.component';
import {MediaObserver} from '@angular/flex-layout';
import {MatSort} from '@angular/material/sort';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent implements OnInit {
  deleteItem: ServiceItem;
  domain: string;
  selectedItem: ServiceItem;
  revertItem: ServiceItem;
  dataSource: MatTableDataSource<ServiceItem>;
  displayedColumns = [];

  @ViewChild(PaginatorComponent, { static: true })
  paginator: PaginatorComponent;

  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private service: ServiceViewService,
              public appService: AppConfigService,
              public dialog: MatDialog,
              public snackBar: MatSnackBar,
              public mediaObserver: MediaObserver) {
  }

  ngOnInit() {
    this.route.data
      .subscribe((data: { resp: ServiceItem[]}) => {
        this.dataSource = new MatTableDataSource(data.resp);
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator.paginator;
      }
    );
    this.route.params.subscribe((params) => this.domain = params.domain);
    this.setColumns();
    this.mediaObserver.asObservable().subscribe(c => this.setColumns());
  }

  doFilter(val: string) {
    if (!this.dataSource) { return; }
    this.dataSource.filter = val;
  }

  setColumns() {
    if (this.mediaObserver.isActive('lt-md')) {
      this.displayedColumns = ['actions', 'serviceId'];
    } else {
      this.displayedColumns = ['actions', 'name', 'serviceId', 'description'];
    }
  }

  serviceEdit(item?: ServiceItem) {
    if (item) {
      this.selectedItem = item;
    }
    this.router.navigate(['form/edit', this.selectedItem.assignedId]);
  }

  getYaml() {
    this.router.navigate(['registry/yaml', this.selectedItem.assignedId]);
  }

  getJson() {
    this.router.navigate(['registry/json', this.selectedItem.assignedId]);
  }

  serviceDuplicate() {
    this.router.navigate(['form/duplicate', this.selectedItem.assignedId]);
  }

  openModalDelete() {
    const dialogRef = this.dialog.open(DeleteComponent, {
      data: this.selectedItem,
      width: '500px',
      position: {top: '100px'}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.delete();
      }
    });
    this.deleteItem = this.selectedItem;
  }

  openModalRevert() {
    const dialogRef = this.dialog.open(RevertComponent, {
      data: this.selectedItem,
      width: '500px',
      position: {top: '100px'}
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.revert();
      }
    });
    this.revertItem = this.selectedItem;
  }

  delete() {
    this.service.deleteService(+this.deleteItem.assignedId)
      .subscribe(resp => this.handleDelete(this.deleteItem.name),
       (e: any) => this.snackBar
         .open(e.message || e.text(),
           'Dismiss',
           {duration: 5000}
         )
      );
  }

  handleDelete(name: string) {
    this.snackBar
      .open(name + ' has been successfully deleted.',
        'Dismiss',
        {duration: 5000}
      );
    this.refresh();
  }

  history() {
    const fileName: string = (this.selectedItem.name + '-' + this.selectedItem.assignedId + '.json').replace(/ /g, '');
    this.router.navigate(['version-control/history', fileName]);
  }

  revert() {
    const fileName: string = (this.revertItem.name + '-' + this.revertItem.assignedId + '.json').replace(/ /g, '');
    this.service.revert(fileName)
      .subscribe(this.handleRevert);
  }

  handleRevert() {
    this.refresh();
    this.snackBar
      .open('Change has been reverted',
        'Dismiss',
        {duration: 5000}
      );
  }

  refresh() {
    this.getServices();
  }

  getServices() {
    this.service.getServices(this.domain)
      .subscribe(resp => this.dataSource.data = resp,
       () => this.snackBar
         .open('Unable to retrieve service listing.',
           'Dismiss',
           {duration: 5000}
         )
      );
  }

  moveUp(a: ServiceItem) {
    const index: number = this.dataSource.data.indexOf(a);
    if (index > 0) {
      const b: ServiceItem = this.dataSource.data[index - 1];
      a.evalOrder = index - 1;
      b.evalOrder = index;
      this.service.updateOrder(a, b)
        .subscribe(resp => this.refresh());
    }
  }

  moveDown(a: ServiceItem) {
    const index: number = this.dataSource.data.indexOf(a);
    if (index < this.dataSource.data.length - 1) {
      const b: ServiceItem = this.dataSource.data[index + 1];
      a.evalOrder = index + 1;
      b.evalOrder = index;
      this.service.updateOrder(a, b)
        .subscribe(this.refresh);
    }
  }

  showMoveDown(): boolean {
    if (!this.selectedItem || this.isSorted() || this.dataSource.filter) {
      return false;
    }
    const index = this.dataSource.data.indexOf(this.selectedItem);
    return index < this.dataSource.data.length - 1;
  }

  showMoveUp(): boolean {
    if (!this.selectedItem || this.isSorted() || this.dataSource.filter) {
      return false;
    }
    const index = this.dataSource.data.indexOf(this.selectedItem);
    return index > 0;
  }

  isSorted(): boolean {
    return this.sort.direction !== '';
  }

  showHistory(): boolean {
    return this.appService.config.versionControl &&
           this.selectedItem &&
           this.selectedItem.status !== 'ADD';
  }

  showMetadata(): boolean {
    return this.selectedItem && this.selectedItem.type === 'SAML';
  }

  showRevert(): boolean {
    return this.appService.config.versionControl &&
           this.selectedItem &&
           this.selectedItem.status === 'MODIFY';
  }

  added(row: ServiceItem): boolean {
    return this.appService.config.versionControl &&
           row.status === 'ADDED';
  }

  modified(row: ServiceItem): boolean {
    return this.appService.config.versionControl &&
           row.status === 'MODIFY';
  }

  deleted(row: ServiceItem): boolean {
    return this.appService.config.versionControl &&
           row.status === 'DELETE';
  }

  status(row: ServiceItem): string {
    return this.appService.config.versionControl ? row.status : '';
  }

  createService() {
    this.router.navigate(['form/edit/-1']);
  }
}
