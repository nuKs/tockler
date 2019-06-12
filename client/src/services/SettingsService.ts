import Config from 'electron-store';
import { EventEmitter } from './EventEmitter';
import { Logger } from '../logger';

const { remote } = (window as any).require('electron');
const config = new Config();

export class SettingsService {
    public static service: any = remote.getGlobal('SettingsService');

    public static getOpenAtLogin() {
        return config.get('openAtLogin') as boolean;
    }

    public static getIsAutoUpdateEnabled() {
        return config.get('isAutoUpdateEnabled') as boolean;
    }

    public static saveOpenAtLogin(openAtLogin) {
        if (openAtLogin !== config.get('openAtLogin')) {
            Logger.debug('Setting openAtLogin', openAtLogin);
            config.set('openAtLogin', openAtLogin);

            EventEmitter.send('openAtLoginChanged');
        }
    }

    public static saveIsAutoUpdateEnabled(isAutoUpdateEnabled) {
        if (isAutoUpdateEnabled !== config.get('isAutoUpdateEnabled')) {
            Logger.debug('Setting isAutoUpdateEnabled', isAutoUpdateEnabled);
            config.set('isAutoUpdateEnabled', isAutoUpdateEnabled);
        }
    }

    public static async updateByName(name, jsonData) {
        Logger.info('updateByName', JSON.stringify(jsonData));
        return SettingsService.service.updateByName(name, JSON.stringify(jsonData));
    }

    public static async getRunningLogItem() {
        const runningLogItem = await SettingsService.service.getRunningLogItemAsJson();
        return runningLogItem;
    }

    public static fetchWorkSettings() {
        return SettingsService.service.fetchWorkSettings();
    }

    public static saveAnalyserSettings(data) {
        SettingsService.updateByName('ANALYSER_SETTINGS', data);
    }

    public static async fetchAnalyserSettings() {
        const jsonStr = await SettingsService.service.fetchAnalyserSettingsJsonString();
        Logger.debug('fetchAnalyserSettings', jsonStr);
        return JSON.parse(jsonStr);
    }
}
